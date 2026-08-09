import { useMemo, useState, type ReactNode } from "react";
import { abilitiesGainedThroughBuild } from "../lib/classAbilities";
import type { LevelSnapshot } from "../lib/calculator";
import type { Build } from "../types";

interface Props {
  build: Build;
  perLevel: LevelSnapshot[];
}

function Row({
  label,
  children,
  todo,
  warn,
}: {
  label: string;
  children: ReactNode;
  todo?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2.5">
      <div
        className={`text-xs uppercase tracking-wide mb-1 ${
          warn ? "text-red-400" : todo ? "text-amber-400" : "text-neutral-500"
        }`}
      >
        {label}
        {todo && !warn && <span className="ml-1.5 normal-case tracking-normal">(to choose)</span>}
        {warn && <span className="ml-1.5 normal-case tracking-normal">(problem)</span>}
      </div>
      <div className="text-sm text-neutral-200">{children}</div>
    </div>
  );
}

export function Guidance({ build, perLevel }: Props) {
  const availableLevels = build.levels.map((l) => l.level);
  const [requestedLevel, setRequestedLevel] = useState<number | null>(null);

  const level =
    requestedLevel != null && availableLevels.includes(requestedLevel)
      ? requestedLevel
      : (availableLevels[0] ?? null);

  const allAbilities = useMemo(
    () => abilitiesGainedThroughBuild(build.levels),
    [build.levels]
  );

  if (level == null) {
    return (
      <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
        <h2 className="text-lg font-semibold text-neutral-100 mb-1">Level Guidance</h2>
        <p className="text-sm text-neutral-500">
          Add levels above, then pick a level here for a single summary of what to choose
          (class, ability increase, feats, skill points).
        </p>
      </section>
    );
  }

  const levelIndex = build.levels.findIndex((l) => l.level === level);
  const entry = build.levels[levelIndex];
  const snap = perLevel[levelIndex];

  const className = entry?.className ?? "";
  const abilityDue = level % 4 === 0;
  const abilityPick = entry?.abilityIncrease;

  const featSlots = snap?.featsGained ?? 0;
  const featsAtLevel = build.feats.filter((f) => f.level === level);
  const featsMissing = Math.max(0, featSlots - featsAtLevel.length);
  const featsExtra = Math.max(0, featsAtLevel.length - featSlots);

  const bankedBefore = levelIndex > 0 ? (perLevel[levelIndex - 1]?.skillPointsBanked ?? 0) : 0;
  const earned = snap?.skillPointsGained ?? 0;
  const spent = snap?.skillPointsSpent ?? 0;
  const available = bankedBefore + earned;
  const bankedAfter = snap?.skillPointsBanked ?? available - spent;

  const skillRanksThisLevel: { name: string; ranks: number }[] = [];
  const rankMap: Record<string, number> = {};
  for (const alloc of build.skills) {
    if (alloc.level === level && alloc.ranks > 0) {
      rankMap[alloc.skillName] = (rankMap[alloc.skillName] ?? 0) + alloc.ranks;
    }
  }
  for (const [name, ranks] of Object.entries(rankMap).sort(([a], [b]) => a.localeCompare(b))) {
    skillRanksThisLevel.push({ name, ranks });
  }

  const abilitiesHere = allAbilities.filter((a) => a.characterLevel === level);

  function goTo(target: number) {
    if (availableLevels.includes(target)) setRequestedLevel(target);
  }

  const idx = availableLevels.indexOf(level);
  const todos: string[] = [];
  if (!className) todos.push("class");
  if (abilityDue && !abilityPick) todos.push("ability increase");
  if (featsMissing > 0) todos.push(`${featsMissing} feat${featsMissing === 1 ? "" : "s"}`);
  if (className && earned > 0 && spent === 0) todos.push("skill points");

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <h2 className="text-lg font-semibold text-neutral-100">Level Guidance</h2>
        {todos.length > 0 ? (
          <span className="text-sm text-amber-300">
            Still to choose: {todos.join(", ")}
          </span>
        ) : (
          <span className="text-sm text-emerald-400/90">This level looks filled in</span>
        )}
      </div>
      <p className="text-xs text-neutral-500 mb-3">
        One place for what happens at a given level — class, ability bump, feat slots, skill
        points, and class features — so you do not have to scan the whole page.
      </p>

      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => goTo(availableLevels[idx - 1])}
          disabled={idx <= 0}
          className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
        >
          &larr; Prev
        </button>
        <select
          value={level}
          onChange={(e) => setRequestedLevel(Number(e.target.value))}
          className="bg-neutral-950 border border-neutral-700 rounded px-3 py-1.5 text-neutral-100 text-sm min-w-[12rem]"
        >
          {build.levels.map((l) => {
            const s = perLevel[build.levels.findIndex((x) => x.level === l.level)];
            const slots = s?.featsGained ?? 0;
            const have = build.feats.filter((f) => f.level === l.level).length;
            const featHint =
              slots > 0 ? ` · feats ${have}/${slots}` : have > 0 ? ` · feats ${have}/0` : "";
            return (
              <option key={l.level} value={l.level}>
                Level {l.level}
                {l.className ? ` — ${l.className}` : " — no class"}
                {featHint}
              </option>
            );
          })}
        </select>
        <button
          type="button"
          onClick={() => goTo(availableLevels[idx + 1])}
          disabled={idx >= availableLevels.length - 1}
          className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
        >
          Next &rarr;
        </button>
      </div>

      <div className="text-center mb-4">
        <div className="text-2xl font-semibold text-neutral-100">
          Level {level}
          {className ? (
            <span className="text-violet-300 font-normal"> · {className}</span>
          ) : (
            <span className="text-amber-300 font-normal"> · choose class</span>
          )}
        </div>
        {snap && className && (
          <div className="mt-1 text-xs text-neutral-500 font-mono flex flex-wrap justify-center gap-x-3 gap-y-0.5">
            <span>HP +{snap.hp}</span>
            <span>BAB +{snap.bab}</span>
            <span>Fort +{snap.fort}</span>
            <span>Ref +{snap.ref}</span>
            <span>Will +{snap.will}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Row label="Class" todo={!className}>
          {className ? (
            <span>
              Take a level of <span className="font-medium text-neutral-100">{className}</span>
            </span>
          ) : (
            <span className="text-amber-300">Pick a class for this level in the Levels table.</span>
          )}
        </Row>

        <Row label="Ability increase" todo={abilityDue && !abilityPick}>
          {abilityDue ? (
            abilityPick ? (
              <span>
                +1 <span className="font-medium text-neutral-100">{abilityPick}</span> (every 4th
                level)
              </span>
            ) : (
              <span className="text-amber-300">
                Choose which ability gets +1 (STR / DEX / CON / INT / WIS / CHA).
              </span>
            )
          ) : (
            <span className="text-neutral-500">None this level (ability bumps on levels 4, 8, 12…).</span>
          )}
        </Row>

        <Row
          label="Feats"
          todo={featsMissing > 0}
          warn={featsExtra > 0}
        >
          {featSlots === 0 && featsAtLevel.length === 0 ? (
            <span className="text-neutral-500">No feat slots earned at this level.</span>
          ) : (
            <div className="space-y-1">
              <div className="text-neutral-400 text-xs">
                {featSlots} slot{featSlots === 1 ? "" : "s"} earned
                {featsMissing > 0 && (
                  <span className="text-amber-300"> · {featsMissing} still open</span>
                )}
                {featsExtra > 0 && (
                  <span className="text-red-400"> · {featsExtra} over limit</span>
                )}
              </div>
              {featsAtLevel.length > 0 ? (
                <ul className="list-disc list-inside space-y-0.5">
                  {featsAtLevel.map((f, i) => (
                    <li key={`${f.name}-${i}`}>
                      <span className="text-neutral-100">{f.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-amber-300">
                  Choose {featSlots} feat{featSlots === 1 ? "" : "s"} in the Feats panel.
                </span>
              )}
            </div>
          )}
        </Row>

        <Row
          label="Skill points"
          todo={!!className && earned > 0 && spent === 0}
          warn={bankedAfter < 0}
        >
          {!className ? (
            <span className="text-neutral-500">Set a class to see skill points for this level.</span>
          ) : (
            <div className="space-y-1.5">
              <div className="font-mono text-xs text-neutral-400 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>
                  Earn <span className="text-neutral-200">{earned}</span>
                </span>
                <span>
                  Bank before <span className="text-neutral-200">{bankedBefore}</span>
                </span>
                <span>
                  Available <span className="text-neutral-200">{available}</span>
                </span>
                <span>
                  Spent <span className="text-neutral-200">{spent}</span>
                </span>
                <span className={bankedAfter < 0 ? "text-red-400" : ""}>
                  Bank after <span className="text-neutral-200">{bankedAfter}</span>
                </span>
              </div>
              {bankedAfter < 0 ? (
                <span className="text-red-400">Overspent — remove ranks or spend less.</span>
              ) : skillRanksThisLevel.length > 0 ? (
                <ul className="list-disc list-inside space-y-0.5">
                  {skillRanksThisLevel.map((s) => (
                    <li key={s.name}>
                      <span className="text-neutral-100">{s.name}</span>
                      <span className="text-neutral-500 font-mono"> +{s.ranks}</span>
                    </li>
                  ))}
                </ul>
              ) : earned > 0 || available > 0 ? (
                <span className={spent === 0 && earned > 0 ? "text-amber-300" : "text-neutral-500"}>
                  {spent === 0 && earned > 0
                    ? "No ranks bought yet — spend in Skill Points by Level, or bank for later."
                    : "No ranks bought at this level (points banked or spent elsewhere)."}
                </span>
              ) : (
                <span className="text-neutral-500">No skill points this level.</span>
              )}
            </div>
          )}
        </Row>
      </div>

      {abilitiesHere.length > 0 && (
        <div className="mt-2">
          <Row label="Class features gained">
            <ul className="space-y-2">
              {abilitiesHere.map((a, i) => (
                <li key={i}>
                  <div className="font-medium text-neutral-100">{a.title}</div>
                  {a.description && (
                    <p className="text-xs text-neutral-500 mt-0.5">{a.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </Row>
        </div>
      )}
    </section>
  );
}
