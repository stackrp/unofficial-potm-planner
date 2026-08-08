import { classSkillSet } from "../data/skills";
import type { SkillStatus } from "../data/skills";

/**
 * A skill's status for a (possibly multiclass) build: class skill if any taken class
 * grants it as a class skill; unavailable only if every taken class forbids it;
 * cross-class otherwise. This mirrors NWN's per-level-up class/cross-class
 * determination, collapsed to a whole-build view since this planner shows a final
 * sheet rather than a level-by-level purchase history.
 */
export function skillStatusForBuild(skillName: string, classNames: string[]): SkillStatus {
  if (classNames.length === 0) return "crossClass";
  let sawAvailable = false;
  for (const className of classNames) {
    const { classSkills, unavailable } = classSkillSet(className);
    if (classSkills.has(skillName)) return "class";
    if (!unavailable.has(skillName)) sawAvailable = true;
  }
  return sawAvailable ? "crossClass" : "unavailable";
}

export function skillPointCost(ranks: number, status: SkillStatus): number {
  if (status === "unavailable") return Infinity;
  return status === "class" ? ranks : ranks * 2;
}

export function skillMaxRank(totalLevel: number, status: SkillStatus): number {
  if (status === "unavailable") return 0;
  const classMax = totalLevel + 3;
  return status === "class" ? classMax : Math.floor(classMax / 2);
}
