import { classSkillSet } from "../data/skills";
import type { SkillStatus } from "../data/skills";
import type { LevelEntry } from "../types";

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
 * The earliest future level (after `fromLevel`) at which a skill flips to class-skill status,
 * given the classes the plan takes on. Used to flag "bank points now, spend them here instead."
 * Returns undefined if it never becomes a class skill by the plan's last level.
 */
export function nextClassSkillLevel(
  skillName: string,
  levels: LevelEntry[],
  fromLevel: number
): number | undefined {
  const maxLevel = levels.length ? levels[levels.length - 1].level : 0;
  for (let level = fromLevel + 1; level <= maxLevel; level++) {
    const classes = classesTakenThroughLevel(levels, level);
    if (skillStatusForBuild(skillName, classes) === "class") return level;
  }
  return undefined;
}
