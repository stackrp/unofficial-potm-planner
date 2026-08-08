import { ALL_SKILLS } from "../data/skills";
import type { SkillSnapshot } from "../lib/calculator";
import type { SkillAllocation } from "../types";

interface Props {
  allocations: SkillAllocation[];
  onChange: (allocations: SkillAllocation[]) => void;
  skills: SkillSnapshot[];
  skillPointsAvailable: number;
}

const STATUS_LABEL: Record<SkillSnapshot["status"], string> = {
  class: "Class",
  crossClass: "Cross-class",
  unavailable: "Unavailable",
};

const STATUS_CLASS: Record<SkillSnapshot["status"], string> = {
  class: "text-emerald-400",
  crossClass: "text-amber-400",
  unavailable: "text-neutral-600",
};

export function SkillList({ allocations, onChange, skills, skillPointsAvailable }: Props) {
  const skillsByName = new Map(skills.map((s) => [s.name, s]));
  const totalSpent = skills.reduce((s, sk) => s + (Number.isFinite(sk.pointCost) ? sk.pointCost : 0), 0);
  const overspent = totalSpent > skillPointsAvailable;

  function setRanks(skillName: string, ranks: number) {
    const clamped = Math.max(0, ranks);
    const existing = allocations.find((a) => a.skillName === skillName);
    if (existing) {
      onChange(
        allocations.map((a) => (a.skillName === skillName ? { ...a, ranks: clamped } : a))
      );
    } else {
      onChange([...allocations, { skillName, ranks: clamped }]);
    }
  }

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-100">Skills</h2>
        <span className={`text-sm font-mono ${overspent ? "text-red-400" : "text-neutral-400"}`}>
          {totalSpent} / {skillPointsAvailable} points spent
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="text-neutral-400 border-b border-neutral-700">
              <th className="py-1 pr-2 font-medium">Skill</th>
              <th className="py-1 pr-2 font-medium">Ability</th>
              <th className="py-1 pr-2 font-medium">Status</th>
              <th className="py-1 pr-2 font-medium text-right">Ranks</th>
              <th className="py-1 pr-2 font-medium text-right">Max</th>
              <th className="py-1 pr-2 font-medium text-right">Cost</th>
              <th className="py-1 pr-2 font-medium text-right">Total Mod</th>
            </tr>
          </thead>
          <tbody>
            {ALL_SKILLS.map((def) => {
              const snap = skillsByName.get(def.name);
              const status = snap?.status ?? "crossClass";
              const ranks = snap?.ranks ?? 0;
              const maxRank = snap?.maxRank ?? 0;
              const cost = snap && Number.isFinite(snap.pointCost) ? snap.pointCost : 0;
              const overMax = ranks > maxRank;
              return (
                <tr key={def.name} className="border-b border-neutral-800">
                  <td className="py-1 pr-2 text-neutral-200">
                    {def.name}
                    {def.trainedOnly && <span className="text-neutral-600 text-xs"> (trained)</span>}
                  </td>
                  <td className="py-1 pr-2 text-neutral-500 font-mono">{def.ability}</td>
                  <td className={`py-1 pr-2 font-medium ${STATUS_CLASS[status]}`}>
                    {STATUS_LABEL[status]}
                  </td>
                  <td className="py-1 pr-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={status === "unavailable" ? 0 : undefined}
                      value={ranks}
                      disabled={status === "unavailable"}
                      onChange={(e) => setRanks(def.name, Number(e.target.value))}
                      className={`w-14 bg-neutral-950 border rounded px-1 py-0.5 text-right font-mono disabled:opacity-30 ${
                        overMax ? "border-red-600 text-red-400" : "border-neutral-700 text-neutral-100"
                      }`}
                    />
                  </td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-500">{maxRank}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-400">{cost}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-100">
                    {ranks > 0 || (snap?.totalModifier ?? 0) !== 0
                      ? `+${snap?.totalModifier ?? 0}`
                      : "+0"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Class skills cost 1 point/rank (max level+3). Cross-class skills cost 2 points/rank
        (max floor((level+3)/2)), per NWN's engine rules — not tabletop 3.5e's half-rank system.
      </p>
    </section>
  );
}
