import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { ALL_SKILLS } from "../data/skills";
import { skillMaxRank, skillStatusForClass } from "../lib/skillRules";
import {
  optimizeSkills,
  type GreedMode,
  type SkillOptimizerResult,
  type SkillPriority,
} from "../lib/skillOptimizer";
import { deriveSkillDeadlines, toDeadlineMap } from "../lib/skillDeadlines";
import type { LevelSnapshot } from "../lib/calculator";
import type { Build, SkillAllocation } from "../types";

interface Props {
  build: Build;
  perLevel: LevelSnapshot[];
  open: boolean;
  onClose: () => void;
  onApply: (skills: SkillAllocation[]) => void;
}

/** A user-added rank checkpoint (feat/prestige ones are derived, not stored here). */
interface ManualDeadline {
  skill: string;
  ranks: number;
  byLevel: number;
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

const GREED_OPTIONS: Array<{ value: GreedMode; label: string; blurb: string }> = [
  { value: "eager", label: "Level as you go", blurb: "Buy ranks early, barely bank. Skills are online sooner; a few late-window skills may end lower." },
  { value: "balanced", label: "Balanced", blurb: "Bank a moderate amount for cheaper/later levels." },
  { value: "max", label: "Endgame-max", blurb: "Bank freely for the highest possible final ranks, even if skills sit low for a while." },
];

/** A fingerprint of the outcomes that matter, so the mode comparison hides itself when the
 * three modes would give identical results. */
function planSignature(r: SkillOptimizerResult): string {
  return r.perSkill.map((s) => s.achieved).join(",") + `|${r.peakBanked}`;
}

/** The Banking mode picker, plus a side-by-side outcome table shown only when the modes diverge. */
function BankingModeSection({
  greed,
  onChange,
  results,
  comparisonSkills,
}: {
  greed: GreedMode;
  onChange: (greed: GreedMode) => void;
  results: Record<GreedMode, SkillOptimizerResult>;
  comparisonSkills: string[];
}) {
  const modesDiffer = new Set(GREED_OPTIONS.map((o) => planSignature(results[o.value]))).size > 1;

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-neutral-500">Banking</span>
        <div className="inline-flex rounded-md border border-neutral-700 overflow-hidden">
          {GREED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-2.5 py-1 text-xs whitespace-nowrap ${
                greed === opt.value
                  ? "bg-violet-700 text-white"
                  : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{GREED_OPTIONS.find((o) => o.value === greed)!.blurb}</p>

      {comparisonSkills.length > 0 && modesDiffer && (
        <div className="mt-2 overflow-x-auto rounded-md border border-neutral-800">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-neutral-400 border-b border-neutral-700 bg-neutral-950/50">
                <th className="py-2 px-3 text-left font-medium">Mode comparison</th>
                {GREED_OPTIONS.map((o) => (
                  <th
                    key={o.value}
                    className={`py-2 px-3 text-center font-medium whitespace-nowrap ${greed === o.value ? "text-violet-300" : ""}`}
                  >
                    {o.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {comparisonSkills.map((name) => (
                <tr key={name} className="border-b border-neutral-800/80">
                  <td className="py-1.5 px-3 text-left font-sans text-neutral-300 whitespace-nowrap">{name}</td>
                  {GREED_OPTIONS.map((o) => {
                    const s = results[o.value].perSkill.find((r) => r.skillName === name);
                    return (
                      <td
                        key={o.value}
                        className={`py-1.5 px-3 text-center ${s?.fullyFunded ? "text-neutral-400" : "text-amber-400"}`}
                      >
                        {s ? `${s.achieved}/${s.target}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="py-1.5 px-3 text-left font-sans text-neutral-500 whitespace-nowrap">Peak points banked</td>
                {GREED_OPTIONS.map((o) => (
                  <td key={o.value} className="py-1.5 px-3 text-center text-neutral-400">
                    {results[o.value].peakBanked}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function SkillOptimizerModal({ build, perLevel, open, onClose, onApply }: Props) {
  const [primarySkills, setPrimarySkills] = useState<string[]>([]);
  const [secondarySkills, setSecondarySkills] = useState<string[]>([]);
  const [caps, setCaps] = useState<Record<string, number>>({});
  const [manualDeadlines, setManualDeadlines] = useState<ManualDeadline[]>([]);
  const [dumpLeftover, setDumpLeftover] = useState(false);
  const [greed, setGreed] = useState<GreedMode>("balanced");
  const [confirmingApply, setConfirmingApply] = useState(false);

  const finalLevel = build.levels.length > 0 ? build.levels[build.levels.length - 1].level : null;

  const autoDeadlines = useMemo(() => deriveSkillDeadlines(build), [build]);
  const requirementRows = useMemo(
    () =>
      [...autoDeadlines, ...manualDeadlines.map((d) => ({ ...d, source: "custom" }))].sort(
        (a, b) => a.byLevel - b.byLevel || a.skill.localeCompare(b.skill),
      ),
    [autoDeadlines, manualDeadlines],
  );
  const deadlineMap = useMemo(() => toDeadlineMap(requirementRows), [requirementRows]);
  const deadlineSkillNames = useMemo(() => new Set(Object.keys(deadlineMap)), [deadlineMap]);

  // A skill a planned feat/prestige entry depends on is selected automatically when the modal
  // opens (or when the requirements change while open), so it shows up as a funded row.
  useEffect(() => {
    if (!open) return;
    setPrimarySkills((prev) => {
      const add = [...deadlineSkillNames].filter(
        (name) => !prev.includes(name) && !secondarySkills.includes(name),
      );
      return add.length > 0 ? [...prev, ...add] : prev;
    });
  }, [open, deadlineSkillNames, secondarySkills]);

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

  const results = useMemo((): Record<GreedMode, SkillOptimizerResult> => {
    const run = (g: GreedMode) =>
      optimizeSkills({
        levels: build.levels,
        perLevel,
        primarySkills,
        secondarySkills,
        dumpLeftover,
        caps,
        deadlines: deadlineMap,
        greed: g,
      });
    return { eager: run("eager"), balanced: run("balanced"), max: run("max") };
  }, [build.levels, perLevel, primarySkills, secondarySkills, dumpLeftover, caps, deadlineMap]);
  const result = results[greed];
  const resultBySkill = useMemo(
    () => Object.fromEntries(result.perSkill.map((r) => [r.skillName, r])),
    [result]
  );
  const deadlineResultAt = (skill: string, byLevel: number) =>
    result.deadlineResults.find((d) => d.skillName === skill && d.byLevel === byLevel);
  const unmetCount = result.deadlineResults.filter((d) => !d.met).length;

  function handleApply() {
    onApply(result.allocations);
    setConfirmingApply(false);
    onClose();
  }

  const hasSelection = primarySkills.length > 0 || secondarySkills.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Skill Progression Optimization" widthClass="max-w-5xl">
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

          <div className="mb-3 rounded-md border border-neutral-800 bg-neutral-950/40 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                Ranks by level your feats &amp; prestige classes require
              </div>
              {requirementRows.length > 0 && (
                <div className={`text-xs ${unmetCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {unmetCount > 0 ? `${unmetCount} not met by the plan` : "all met"}
                </div>
              )}
            </div>
            {requirementRows.length === 0 ? (
              <p className="mt-1 text-xs text-neutral-500">
                No planned feat or prestige class needs skill ranks. Add a custom requirement below to force a
                skill to a rank by a level.
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1 text-sm">
                {requirementRows.map((r, i) => {
                  const dr = deadlineResultAt(r.skill, r.byLevel);
                  const met = dr?.met ?? false;
                  const feasibleMax = skillMaxRank(r.skill, build.levels, r.byLevel);
                  const impossible = r.ranks > feasibleMax;
                  return (
                    <li key={`${r.skill}-${r.byLevel}-${r.source}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={met ? "text-emerald-400" : "text-amber-400"}>{met ? "✓" : "⚠"}</span>
                      <span className="text-neutral-200">{r.skill}</span>
                      <span className="font-mono tabular-nums text-neutral-400">
                        {dr?.achieved ?? 0}/{r.ranks} by Lv{r.byLevel}
                      </span>
                      <span className="text-xs text-neutral-500">{r.source}</span>
                      {impossible && (
                        <span className="text-xs text-red-400">
                          only {feasibleMax} possible by Lv{r.byLevel}
                        </span>
                      )}
                      {r.source === "custom" && (
                        <button
                          type="button"
                          onClick={() =>
                            setManualDeadlines((prev) =>
                              prev.filter((d) => !(d.skill === r.skill && d.byLevel === r.byLevel && d.ranks === r.ranks)),
                            )
                          }
                          className="text-xs text-neutral-600 hover:text-red-400"
                        >
                          remove
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <ManualDeadlineAdder
              levels={build.levels.map((l) => l.level)}
              skills={ALL_SKILLS.filter((s) => skillMaxRank(s.name, build.levels, finalLevel) > 0).map(
                (s) => s.name,
              )}
              onAdd={(d) =>
                setManualDeadlines((prev) =>
                  prev.some((x) => x.skill === d.skill && x.byLevel === d.byLevel)
                    ? prev.map((x) => (x.skill === d.skill && x.byLevel === d.byLevel ? d : x))
                    : [...prev, d],
                )
              }
            />
          </div>

          <BankingModeSection
            greed={greed}
            onChange={setGreed}
            results={results}
            comparisonSkills={[...primarySkills, ...secondarySkills]}
          />

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
                  <th className="py-2.5 px-3 font-medium text-center whitespace-nowrap">Needed by Lv</th>
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
                  const skillDeadlines = deadlineMap[def.name] ?? [];

                  return (
                    <tr key={def.name} className="border-b border-neutral-800/80 hover:bg-neutral-800/30">
                      <td className="py-2 px-3 text-left text-neutral-200 whitespace-nowrap">
                        {def.name}
                        {skillDeadlines.length > 0 && (
                          <span className="ml-1.5 text-xs text-violet-400" title="Required by a planned feat / prestige class">
                            ★
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center text-xs text-neutral-400 whitespace-nowrap">
                        {classLevels.length > 0 ? formatLevelRanges(classLevels) : "—"}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-neutral-300 tabular-nums">
                        {unavailable ? "—" : bestRank}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {!unavailable && (priority || skillDeadlines.length > 0) && (
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
                      <td className="py-2 px-3 text-center text-xs whitespace-nowrap">
                        {skillDeadlines.length === 0 ? (
                          <span className="text-neutral-600">—</span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 font-mono tabular-nums">
                            {skillDeadlines.map((d) => {
                              const dr = deadlineResultAt(def.name, d.byLevel);
                              const met = dr?.met ?? false;
                              return (
                                <span key={d.byLevel} className={met ? "text-neutral-400" : "text-amber-400"}>
                                  {met ? "✓" : "⚠"} {d.ranks} by Lv{d.byLevel}
                                </span>
                              );
                            })}
                          </div>
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
                            {(skillDeadlines.length > 0
                              ? PRIORITY_OPTIONS.filter((o) => o.value !== null)
                              : PRIORITY_OPTIONS
                            ).map((opt) => (
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
          {unmetCount > 0 && (
            <p className="mt-2 text-xs text-amber-400">
              ⚠ The plan can&apos;t reach every required rank in time &mdash; the skill isn&apos;t a class skill
              early enough, or another selection is using the points. Try Endgame-max banking, raise the skill&apos;s
              priority, or lower a competing skill&apos;s Cap.
            </p>
          )}

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

/** Compact "need N ranks in <skill> by level L" builder for requirements the planner can't derive
 * (a feat you haven't slotted yet, a server rule, ...). */
function ManualDeadlineAdder({
  levels,
  skills,
  onAdd,
}: {
  levels: number[];
  skills: string[];
  onAdd: (d: ManualDeadline) => void;
}) {
  const [skill, setSkill] = useState(skills[0] ?? "");
  const [ranks, setRanks] = useState(1);
  const [byLevel, setByLevel] = useState(levels[levels.length - 1] ?? 1);

  if (levels.length === 0 || skills.length === 0) return null;
  const effectiveSkill = skills.includes(skill) ? skill : skills[0];

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-neutral-400">
      <span className="text-neutral-500">Add your own:</span>
      <select
        value={effectiveSkill}
        onChange={(e) => setSkill(e.target.value)}
        className="bg-neutral-950 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
      >
        {skills.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        value={ranks}
        onChange={(e) => setRanks(Math.max(1, Number(e.target.value)))}
        className="w-12 bg-neutral-950 border border-neutral-700 rounded px-1 py-1 text-center font-mono tabular-nums text-neutral-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span>ranks by Lv</span>
      <select
        value={byLevel}
        onChange={(e) => setByLevel(Number(e.target.value))}
        className="bg-neutral-950 border border-neutral-700 rounded px-1.5 py-1 text-neutral-100"
      >
        {levels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onAdd({ skill: effectiveSkill, ranks, byLevel })}
        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
      >
        Add
      </button>
    </div>
  );
}
