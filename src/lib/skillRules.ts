import { classSkillSet } from "../data/skills";
import type { SkillStatus } from "../data/skills";
import type { LevelEntry } from "../types";

/**
 * Class / cross-class / unavailable status for a skill relative to a single class —
 * i.e. the class being taken at a given level-up. NWN prices ranks off this class alone:
 * class skills cost 1 point/rank, cross-class cost 2, unavailable cannot be bought.
 */
export function skillStatusForClass(skillName: string, className: string): SkillStatus {
  if (!className) return "crossClass";
  const { classSkills, unavailable } = classSkillSet(className);
  if (classSkills.has(skillName)) return "class";
  if (unavailable.has(skillName)) return "unavailable";
  return "crossClass";
}

/**
 * Status used for max-rank caps across a multiclass build. In NWN, if a skill is a class
 * skill for ANY of your classes, max ranks are character level + 3; otherwise the cap is
 * floor((level+3)/2). Unavailable only if every taken class forbids the skill.
 *
 * This is intentionally separate from purchase cost, which is always per the class leveled
 * at that moment (`skillStatusForClass`).
 */
export function skillStatusForMaxRank(skillName: string, classNames: string[]): SkillStatus {
  if (classNames.length === 0) return "crossClass";
  let sawAvailable = false;
  for (const className of classNames) {
    const { classSkills, unavailable } = classSkillSet(className);
    if (classSkills.has(skillName)) return "class";
    if (!unavailable.has(skillName)) sawAvailable = true;
  }
  return sawAvailable ? "crossClass" : "unavailable";
}

/** @deprecated Prefer skillStatusForClass (cost) or skillStatusForMaxRank (caps). */
export function skillStatusForBuild(skillName: string, classNames: string[]): SkillStatus {
  return skillStatusForMaxRank(skillName, classNames);
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

/** Distinct classes the build has taken through (and including) `uptoLevel`, in the order first taken. */
export function classesTakenThroughLevel(levels: LevelEntry[], uptoLevel: number): string[] {
  const seen = new Set<string>();
  for (const entry of levels) {
    if (entry.level > uptoLevel) break;
    if (entry.className) seen.add(entry.className);
  }
  return [...seen];
}

/**
 * The earliest future level (after `fromLevel`) at which a skill is a class skill for the
 * class taken on that level — i.e. when it becomes cheap to buy (1 point/rank). Used to flag
 * "bank points now, spend them here instead." Returns undefined if no later level in the plan
 * takes a class that grants it as a class skill.
 */
export function nextClassSkillLevel(
  skillName: string,
  levels: LevelEntry[],
  fromLevel: number
): number | undefined {
  for (const entry of levels) {
    if (entry.level <= fromLevel) continue;
    if (entry.className && skillStatusForClass(skillName, entry.className) === "class") {
      return entry.level;
    }
  }
  return undefined;
}
