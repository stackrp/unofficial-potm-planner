import { useState } from "react";
import { ALL_SKILLS } from "../data/skills";
import type { LevelSnapshot } from "../lib/calculator";
import {
  classesTakenThroughLevel,
  nextClassSkillLevel,
  skillMaxRank,
  skillPointCost,
  skillStatusForClass,
  skillStatusForMaxRank,
} from "../lib/skillRules";
import type { SkillStatus } from "../data/skills";
import type { Build, SkillAllocation } from "../types";

interface Props {
  build: Build;
  onChange: (skills: SkillAllocation[]) => void;
  perLevel: LevelSnapshot[];
}

const STATUS_LABEL: Record<SkillStatus, string> = {
  class: "Class",
  crossClass: "Cross-class",
  unavailable: "Unavailable",
};

const STATUS_CLASS: Record<SkillStatus, string> = {
  class: "text-emerald-400",
  crossClass: "text-amber-400",
  unavailable: "text-neutral-600",
};

const STATUS_ROW_BG: Record<SkillStatus, string> = {
  class: "bg-emerald-950/10",
  crossClass: "bg-amber-950/10",
  unavailable: "",
};

// Class skills first, then cross-class, then unavailable, so the skills worth spending on aren't
// buried among ones you can't put ranks into.
const STATUS_ORDER: Record<SkillStatus, number> = { class: 0, crossClass: 1, unavailable: 2 };

const HIDDEN_SKILLS_KEY = "potm-hidden-skills";

function loadHiddenSkills(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_SKILLS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function SkillPlanner({ build, onChange, perLevel }: Props) {
  const availableLevels = build.levels.map((l) => l.level);
  const [requestedLevel, setRequestedLevel] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [hiddenSkills, setHiddenSkills] = useState<Set<string>>(() => loadHiddenSkills());
  const level =
    requestedLevel != null && availableLevels.includes(requestedLevel)
      ? requestedLevel
      : (availableLevels[availableLevels.length - 1] ?? null);

  if (level == null) {
    return (
      <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
        <h2 className="text-lg font-semibold text-neutral-100 mb-1">Skill Points by Level</h2>
        <p className="text-sm text-neutral-500">Add levels first to plan skill point spending.</p>
      </section>
    );
  }

  const levelIndex = build.levels.findIndex((l) => l.level === level);
  const entry = build.levels[levelIndex];
  const snap = perLevel[levelIndex];
  const bankedBefore = levelIndex > 0 ? (perLevel[levelIndex - 1]?.skillPointsBanked ?? 0) : 0;
  const earned = snap?.skillPointsGained ?? 0;
  const spent = snap?.skillPointsSpent ?? 0;
  const available = bankedBefore + earned;
  const bankedAfter = snap?.skillPointsBanked ?? available - spent;

  // Cost/status at this level follows the class taken HERE (NWN rule). Max ranks use any class
  // taken through this level — class skill for any of them unlocks the full level+3 cap.
  const classAtLevel = entry.className;
  const classesSoFar = classesTakenThroughLevel(build.levels, level);

  // Cumulative ranks purchased strictly before this level, per skill.
  const ranksBefore: Record<string, number> = {};
  for (const alloc of build.skills) {
    if (alloc.level < level) ranksBefore[alloc.skillName] = (ranksBefore[alloc.skillName] ?? 0) + alloc.ranks;
  }
  // Ranks purchased at this level, per skill.
  const ranksThisLevel: Record<string, number> = {};
  for (const alloc of build.skills) {
    if (alloc.level === level) ranksThisLevel[alloc.skillName] = (ranksThisLevel[alloc.skillName] ?? 0) + alloc.ranks;
  }

  function setRanks(skillName: string, ranks: number) {
    const clamped = Math.max(0, ranks);
    const withoutThis = build.skills.filter((s) => !(s.level === level && s.skillName === skillName));
    onChange(clamped === 0 ? withoutThis : [...withoutThis, { level, skillName, ranks: clamped }]);
  }

  function goTo(target: number) {
    if (availableLevels.includes(target)) setRequestedLevel(target);
  }

  function setSkillHidden(skillName: string, hidden: boolean) {
    setHiddenSkills((prev) => {
      const next = new Set(prev);
      if (hidden) next.add(skillName);
      else next.delete(skillName);
      localStorage.setItem(HIDDEN_SKILLS_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function handleResetSkills() {
    onChange([]);
    setConfirmingReset(false);
  }

  // Skills with ranks from a previous level surface first, so you can quickly keep adding to what
  // you've already invested in; within that, still grouped by class/cross-class/unavailable.
  const rows = ALL_SKILLS.map((def) => ({
    def,
    status: skillStatusForClass(def.name, classAtLevel),
    maxStatus: skillStatusForMaxRank(def.name, classesSoFar),
    invested: (ranksBefore[def.name] ?? 0) > 0,
  })).sort((a, b) => {
    if (a.invested !== b.invested) return a.invested ? -1 : 1;
    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  });
  const visibleRows = rows.filter((r) => !hiddenSkills.has(r.def.name));
  const hiddenRows = rows.filter((r) => hiddenSkills.has(r.def.name));

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-2 text-lg font-semibold text-neutral-100"
          >
            <span className={`inline-block transition-transform ${collapsed ? "-rotate-90" : ""}`}>&#9662;</span>
            Skill Points by Level
          </button>
          {!collapsed &&
            (!confirmingReset ? (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                disabled={build.skills.length === 0}
                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
              >
                ↻ Reset
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm flex-wrap justify-end">
                <span className="text-amber-400">Reset all skill points on every level?</span>
                <button
                  type="button"
                  onClick={handleResetSkills}
                  className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-sm"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm"
                >
                  No
                </button>
              </div>
            ))}
        </div>
        {!collapsed && (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => goTo(availableLevels[availableLevels.indexOf(level) - 1])}
              disabled={availableLevels.indexOf(level) <= 0}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
            >
              &larr; Prev
            </button>
            <select
              value={level}
              onChange={(e) => setRequestedLevel(Number(e.target.value))}
              className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
            >
              {build.levels.map((l) => (
                <option key={l.level} value={l.level}>
                  Level {l.level} — {l.className || "unset"}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => goTo(availableLevels[availableLevels.indexOf(level) + 1])}
              disabled={availableLevels.indexOf(level) >= availableLevels.length - 1}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-sm">
            <div className="rounded-md border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-center">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Banked before</div>
              <div className="font-mono text-neutral-200">{bankedBefore}</div>
            </div>
            <div className="rounded-md border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-center">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Earned</div>
              <div className="font-mono text-neutral-200">{earned}</div>
            </div>
            <div className="rounded-md border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-center">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Available</div>
              <div className="font-mono text-neutral-200">{available}</div>
            </div>
            <div className="rounded-md border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-center">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Spent</div>
              <div className="font-mono text-neutral-200">{spent}</div>
            </div>
            <div
              className={`rounded-md border px-3 py-2 text-center ${
                bankedAfter < 0 ? "border-red-700 bg-red-950/30" : "border-neutral-700 bg-neutral-950/40"
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-neutral-500">Banked after</div>
              <div className={`font-mono ${bankedAfter < 0 ? "text-red-400" : "text-neutral-200"}`}>{bankedAfter}</div>
            </div>
          </div>

          {!entry.className && (
            <p className="text-xs text-amber-400 mb-2">
              No class chosen at this level yet — pick a class to see accurate class / cross-class pricing.
            </p>
          )}

          <div className="overflow-x-auto rounded-md border border-neutral-800">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-neutral-400 border-b border-neutral-700 bg-neutral-950/50">
                  <th className="py-2.5 px-3 font-medium text-left whitespace-nowrap">Skill</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">
                    Status{classAtLevel ? ` (${classAtLevel})` : ` @ Lv${level}`}
                  </th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Ranks before</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">+ this level</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Max @ Lv{level}</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Cost</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Bank-for-later</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap w-16"></th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map(({ def, status, maxStatus, invested }, i) => {
                  const before = ranksBefore[def.name] ?? 0;
                  const added = ranksThisLevel[def.name] ?? 0;
                  // Cap follows any-class rule; cost follows this level's class only.
                  const maxAtLevel = skillMaxRank(level, maxStatus);
                  const cost = skillPointCost(added, status);
                  const overMax = before + added > maxAtLevel;
                  const upgradeLevel =
                    status !== "class" ? nextClassSkillLevel(def.name, build.levels, level) : undefined;
                  const hasRanks = before + added > 0;
                  const showDivider = i > 0 && !invested && visibleRows[i - 1].invested;
                  const row = (
                    <tr
                      key={def.name}
                      className={`border-b border-neutral-800/80 hover:bg-neutral-800/30 ${STATUS_ROW_BG[status]}`}
                    >
                      <td className="py-2 px-3 text-left text-neutral-200 whitespace-nowrap">{def.name}</td>
                      <td className={`py-2 px-3 text-center font-medium whitespace-nowrap ${STATUS_CLASS[status]}`}>
                        {STATUS_LABEL[status]}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-neutral-400 tabular-nums">{before}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Remove one rank from ${def.name}`}
                            disabled={status === "unavailable" || added <= 0}
                            onClick={() => setRanks(def.name, added - 1)}
                            className="h-8 w-8 shrink-0 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-lg font-semibold leading-none disabled:opacity-30 disabled:hover:bg-neutral-800"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={status === "unavailable" ? 0 : undefined}
                            value={added}
                            disabled={status === "unavailable"}
                            onChange={(e) => setRanks(def.name, Number(e.target.value))}
                            className={`w-12 bg-neutral-950 border rounded px-1 py-1.5 text-center font-mono text-sm tabular-nums disabled:opacity-30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              overMax ? "border-red-600 text-red-400" : "border-neutral-700 text-neutral-100"
                            }`}
                          />
                          <button
                            type="button"
                            aria-label={`Add one rank to ${def.name}`}
                            disabled={status === "unavailable" || before + added >= maxAtLevel}
                            onClick={() => setRanks(def.name, added + 1)}
                            className="h-8 w-8 shrink-0 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-lg font-semibold leading-none disabled:opacity-30 disabled:hover:bg-neutral-800"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-neutral-400 tabular-nums">{maxAtLevel}</td>
                      <td className="py-2 px-3 text-center font-mono text-neutral-300 tabular-nums">
                        {Number.isFinite(cost) ? cost : "—"}
                      </td>
                      <td className="py-2 px-3 text-center text-xs text-violet-400 whitespace-nowrap">
                        {upgradeLevel ? `Class skill at Lv${upgradeLevel} — consider banking` : "—"}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSkillHidden(def.name, true)}
                          disabled={hasRanks}
                          title={hasRanks ? "Has ranks — clear ranks before hiding" : `Hide ${def.name}`}
                          className="text-neutral-600 hover:text-red-400 disabled:opacity-20 disabled:hover:text-neutral-600 text-xs"
                        >
                          Hide
                        </button>
                      </td>
                    </tr>
                  );
                  return [
                    invested && i === 0 && (
                      <tr key="invested-header">
                        <td colSpan={8} className="px-3 pt-3 pb-1.5 text-xs uppercase tracking-wide text-violet-400 bg-neutral-950/30">
                          Already invested
                        </td>
                      </tr>
                    ),
                    showDivider && (
                      <tr key="uninvested-header">
                        <td colSpan={8} className="px-3 pt-3 pb-1.5 text-xs uppercase tracking-wide text-neutral-600 bg-neutral-950/30">
                          Other skills
                        </td>
                      </tr>
                    ),
                    row,
                  ];
                })}
              </tbody>
            </table>
          </div>
          {hiddenRows.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-neutral-500">Hidden skills:</span>
              {hiddenRows.map(({ def }) => (
                <button
                  key={def.name}
                  type="button"
                  onClick={() => setSkillHidden(def.name, false)}
                  title={`Unhide ${def.name}`}
                  className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
                >
                  {def.name} &times;
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            Status and cost follow the class taken at this level only (1 pt/rank class, 2
            cross-class). Max ranks use the multiclass rule: if any class you&apos;ve taken grants
            the skill as a class skill, the cap is level+3. Unspent points bank forward — wait for
            &quot;Class skill at Lv…&quot; to buy at 1 point/rank on a later class level.
          </p>
        </>
      )}
    </section>
  );
}
