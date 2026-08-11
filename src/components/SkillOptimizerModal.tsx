import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { ALL_SKILLS } from "../data/skills";
import { skillMaxRank, skillStatusForClass } from "../lib/skillRules";
import { optimizeSkills, type SkillPriority } from "../lib/skillOptimizer";
import type { LevelSnapshot } from "../lib/calculator";
import type { Build, SkillAllocation } from "../types";

interface Props {
  build: Build;
  perLevel: LevelSnapshot[];
  open: boolean;
  onClose: () => void;
  onApply: (skills: SkillAllocation[]) => void;
}

/** Compresses a sorted list of levels into "1-5, 10, 12-14" for compact display. */
function formatLevelRanges(levels: number[]): string {
  if (levels.length === 0) return "";
  const ranges: string[] = [];
  let start = levels[0];
  let prev = levels[0];
  for (let i = 1; i <= levels.length; i++) {
    const cur = levels[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    if (cur !== undefined) {
      start = cur;
      prev = cur;
    }
  }
  return ranges.join(", ");
}

const PRIORITY_OPTIONS: Array<{ value: SkillPriority | null; label: string }> = [
  { value: null, label: "None" },
  { value: "secondary", label: "Secondary" },
  { value: "primary", label: "Primary" },
];

export function SkillOptimizerModal({ build, perLevel, open, onClose, onApply }: Props) {
  const [primarySkills, setPrimarySkills] = useState<string[]>([]);
  const [secondarySkills, setSecondarySkills] = useState<string[]>([]);
  const [caps, setCaps] = useState<Record<string, number>>({});
  const [dumpLeftover, setDumpLeftover] = useState(false);
  const [confirmingApply, setConfirmingApply] = useState(false);

  const finalLevel = build.levels.length > 0 ? build.levels[build.levels.length - 1].level : null;

  function priorityOf(skillName: string): SkillPriority | null {
    if (primarySkills.includes(skillName)) return "primary";
    if (secondarySkills.includes(skillName)) return "secondary";
    return null;
  }

  function setPriority(skillName: string, priority: SkillPriority | null) {
    if (priorityOf(skillName) === priority) return;
    setPrimarySkills((prev) => prev.filter((s) => s !== skillName));
    setSecondarySkills((prev) => prev.filter((s) => s !== skillName));
    if (priority === "primary") setPrimarySkills((prev) => [...prev, skillName]);
    if (priority === "secondary") setSecondarySkills((prev) => [...prev, skillName]);
    if (priority === null) {
      setCaps((prev) => {
        if (!(skillName in prev)) return prev;
        const next = { ...prev };
        delete next[skillName];
        return next;
      });
    }
  }

  function setCap(skillName: string, rank: number, bestRank: number) {
    const clamped = Math.max(0, Math.min(rank, bestRank));
    setCaps((prev) => ({ ...prev, [skillName]: clamped }));
  }

  const result = useMemo(
    () =>
      optimizeSkills({
        levels: build.levels,
        perLevel,
        primarySkills,
        secondarySkills,
        dumpLeftover,
        caps,
      }),
    [build.levels, perLevel, primarySkills, secondarySkills, dumpLeftover, caps]
  );
  const resultBySkill = useMemo(
    () => Object.fromEntries(result.perSkill.map((r) => [r.skillName, r])),
    [result]
  );

  function handleApply() {
    onApply(result.allocations);
    setConfirmingApply(false);
    onClose();
  }

  const hasSelection = primarySkills.length > 0 || secondarySkills.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Skill Progression Optimization">
      {finalLevel == null ? (
        <p className="text-sm text-neutral-500">Add levels first to plan skill point spending.</p>
      ) : (
        <>
          <p className="text-sm text-neutral-400 mb-3">
            Mark skills as <span className="text-violet-400 font-medium">Primary</span> (must have) or{" "}
            <span className="text-sky-400 font-medium">Secondary</span> (nice to have), and the plan below will
            spend your build&apos;s skill points to get as much of each as possible &mdash; buying at class cost
            when available, and only spending cross-class when there&apos;s no cheaper level left to wait for. Once
            a skill is selected you can lower its Cap if you don&apos;t want it maxed out.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-sm">
            <div className="rounded-md border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-center">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Levels</div>
              <div className="font-mono text-neutral-200">{build.levels.length}</div>
            </div>
            <div className="rounded-md border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-center">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Points earned</div>
              <div className="font-mono text-neutral-200">{result.totalAvailable}</div>
            </div>
            <div className="rounded-md border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-center">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Would spend</div>
              <div className="font-mono text-neutral-200">{result.totalSpent}</div>
            </div>
            <div
              className={`rounded-md border px-3 py-2 text-center ${
                result.endBanked > 0 ? "border-amber-700 bg-amber-950/20" : "border-neutral-700 bg-neutral-950/40"
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-neutral-500">Would bank</div>
              <div className={`font-mono ${result.endBanked > 0 ? "text-amber-400" : "text-neutral-200"}`}>
                {result.endBanked}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 mb-3 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={dumpLeftover}
              onChange={(e) => setDumpLeftover(e.target.checked)}
              className="accent-violet-500"
            />
            Spend any leftover points on other skills too (instead of leaving them banked)
          </label>

          <div className="overflow-x-auto rounded-md border border-neutral-800">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-neutral-400 border-b border-neutral-700 bg-neutral-950/50">
                  <th className="py-2.5 px-3 font-medium text-left whitespace-nowrap">Skill</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Class skill at Lv</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Best rank</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Cap</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Plan gives</th>
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Priority</th>
                </tr>
              </thead>
              <tbody>
                {ALL_SKILLS.map((def) => {
                  const bestRank = skillMaxRank(def.name, build.levels, finalLevel);
                  const unavailable = bestRank === 0;
                  const classLevels = build.levels
                    .filter((l) => skillStatusForClass(def.name, l.className) === "class")
                    .map((l) => l.level);
                  const skillResult = resultBySkill[def.name];
                  const priority = priorityOf(def.name);

                  return (
                    <tr key={def.name} className="border-b border-neutral-800/80 hover:bg-neutral-800/30">
                      <td className="py-2 px-3 text-left text-neutral-200 whitespace-nowrap">{def.name}</td>
                      <td className="py-2 px-3 text-center text-xs text-neutral-400 whitespace-nowrap">
                        {classLevels.length > 0 ? formatLevelRanges(classLevels) : "—"}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-neutral-300 tabular-nums">
                        {unavailable ? "—" : bestRank}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {!unavailable && priority && (
                          <input
                            type="number"
                            min={0}
                            max={bestRank}
                            value={caps[def.name] ?? bestRank}
                            onChange={(e) => setCap(def.name, Number(e.target.value), bestRank)}
                            className="w-14 bg-neutral-950 border border-neutral-700 rounded px-1 py-1 text-center font-mono text-sm tabular-nums text-neutral-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono tabular-nums">
                        {skillResult ? (
                          <span className={skillResult.fullyFunded ? "text-neutral-300" : "text-amber-400"}>
                            {skillResult.achieved}/{skillResult.target}
                            {!skillResult.fullyFunded && " ⚠"}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {unavailable ? (
                          <span className="text-xs text-neutral-600">Unavailable</span>
                        ) : (
                          <div className="inline-flex rounded-md border border-neutral-700 overflow-hidden">
                            {PRIORITY_OPTIONS.map((opt) => (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => setPriority(def.name, opt.value)}
                                className={`px-2 py-1 text-xs whitespace-nowrap ${
                                  priority === opt.value
                                    ? opt.value === "primary"
                                      ? "bg-violet-700 text-white"
                                      : opt.value === "secondary"
                                        ? "bg-sky-700 text-white"
                                        : "bg-neutral-700 text-neutral-100"
                                    : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm"
            >
              Cancel
            </button>
            {!confirmingApply ? (
              <button
                type="button"
                onClick={() => setConfirmingApply(true)}
                disabled={!hasSelection}
                className="px-3 py-1.5 rounded bg-violet-700 hover:bg-violet-600 text-white text-sm disabled:opacity-30"
              >
                Apply Plan
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-amber-400">Overwrite all skill points on every level?</span>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-sm"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingApply(false)}
                  className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm"
                >
                  No
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
