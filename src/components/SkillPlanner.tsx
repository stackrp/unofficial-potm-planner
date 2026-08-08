import { useState } from "react";
import { ALL_SKILLS } from "../data/skills";
import type { LevelSnapshot } from "../lib/calculator";
import { classesTakenThroughLevel, nextClassSkillLevel, skillMaxRank, skillPointCost, skillStatusForBuild } from "../lib/skillRules";
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

export function SkillPlanner({ build, onChange, perLevel }: Props) {
  const availableLevels = build.levels.map((l) => l.level);
  const [requestedLevel, setRequestedLevel] = useState<number | null>(null);
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

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-neutral-100">Skill Points by Level</h2>
        <div className="flex items-center gap-2">
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
      </div>

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
          No class chosen at this level yet — status shown reflects classes taken through the previous level.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="text-neutral-400 border-b border-neutral-700">
              <th className="py-1 pr-2 font-medium">Skill</th>
              <th className="py-1 pr-2 font-medium">Status @ Lv{level}</th>
              <th className="py-1 pr-2 font-medium text-right">Ranks before</th>
              <th className="py-1 pr-2 font-medium text-right">+ this level</th>
              <th className="py-1 pr-2 font-medium text-right">Max @ Lv{level}</th>
              <th className="py-1 pr-2 font-medium text-right">Cost</th>
              <th className="py-1 pr-2 font-medium">Bank-for-later</th>
            </tr>
          </thead>
          <tbody>
            {ALL_SKILLS.map((def) => {
              const status = skillStatusForBuild(def.name, classesSoFar);
              const before = ranksBefore[def.name] ?? 0;
              const added = ranksThisLevel[def.name] ?? 0;
              const maxAtLevel = skillMaxRank(level, status);
              const cost = skillPointCost(added, status);
              const overMax = before + added > maxAtLevel;
              const upgradeLevel =
                status !== "class" ? nextClassSkillLevel(def.name, build.levels, level) : undefined;
              return (
                <tr key={def.name} className="border-b border-neutral-800">
                  <td className="py-1 pr-2 text-neutral-200">{def.name}</td>
                  <td className={`py-1 pr-2 font-medium ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-500">{before}</td>
                  <td className="py-1 pr-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={status === "unavailable" ? 0 : undefined}
                      value={added}
                      disabled={status === "unavailable"}
                      onChange={(e) => setRanks(def.name, Number(e.target.value))}
                      className={`w-14 bg-neutral-950 border rounded px-1 py-0.5 text-right font-mono disabled:opacity-30 ${
                        overMax ? "border-red-600 text-red-400" : "border-neutral-700 text-neutral-100"
                      }`}
                    />
                  </td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-500">{maxAtLevel}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-400">
                    {Number.isFinite(cost) ? cost : "—"}
                  </td>
                  <td className="py-1 pr-2 text-xs text-violet-400">
                    {upgradeLevel ? `Class skill at Lv${upgradeLevel} — consider banking` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Ranks are priced at this level's class/cross-class status. Unspent points carry forward as
        a bank — dump into a cross-class skill now at 2 points/rank, or bank and wait for "Class
        skill at Lv&hellip;" to spend at 1 point/rank instead.
      </p>
    </section>
  );
}
