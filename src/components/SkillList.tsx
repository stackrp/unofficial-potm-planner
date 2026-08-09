import { ALL_SKILLS } from "../data/skills";
import type { SkillSnapshot } from "../lib/calculator";

interface Props {
  skills: SkillSnapshot[];
  totalEarned: number;
  totalBanked: number;
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

export function SkillList({ skills, totalEarned, totalBanked }: Props) {
  const skillsByName = new Map(skills.map((s) => [s.name, s]));
  const totalSpent = totalEarned - totalBanked;
  const allocatedSkills = ALL_SKILLS.filter((def) => (skillsByName.get(def.name)?.ranks ?? 0) > 0);

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-100">Skills (final totals)</h2>
        <span className={`text-sm font-mono ${totalBanked < 0 ? "text-red-400" : "text-neutral-400"}`}>
          {totalSpent} spent / {totalEarned} earned &middot; {totalBanked} banked
        </span>
      </div>

      {allocatedSkills.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No skill points allocated yet — spend some in the "Skill Points by Level" planner above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="text-neutral-400 border-b border-neutral-700">
                <th className="py-1 pr-2 font-medium">Skill</th>
                <th className="py-1 pr-2 font-medium">Ability</th>
                <th className="py-1 pr-2 font-medium">Status</th>
                <th className="py-1 pr-2 font-medium text-right">Ranks</th>
                <th className="py-1 pr-2 font-medium text-right">Max</th>
                <th className="py-1 pr-2 font-medium text-right">Cost paid</th>
                <th className="py-1 pr-2 font-medium text-right">Total Mod</th>
              </tr>
            </thead>
            <tbody>
              {allocatedSkills.map((def) => {
                const snap = skillsByName.get(def.name);
                const status = snap?.status ?? "crossClass";
                const ranks = snap?.ranks ?? 0;
                const maxRank = snap?.maxRank ?? 0;
                const cost = snap?.pointCost ?? 0;
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
                    <td
                      className={`py-1 pr-2 text-right font-mono ${overMax ? "text-red-400" : "text-neutral-100"}`}
                    >
                      {ranks}
                    </td>
                    <td className="py-1 pr-2 text-right font-mono text-neutral-500">{maxRank}</td>
                    <td className="py-1 pr-2 text-right font-mono text-neutral-400">{cost}</td>
                    <td className="py-1 pr-2 text-right font-mono text-neutral-100">
                      {`+${snap?.totalModifier ?? 0}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-500">
        Read-only — allocate ranks level-by-level in the &quot;Skill Points by Level&quot; planner
        above. Status here is the multiclass max-rank view (class if any of your classes grants
        it). Purchase cost is still 1 or 2 points per rank based on the class leveled when the
        ranks were bought, per NWN.
      </p>
    </section>
  );
}
