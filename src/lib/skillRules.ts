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
 * Display-only status across a multiclass build: "class" if the skill is a class skill for ANY
 * class taken (even briefly, even long ago), "unavailable" only if every taken class forbids it,
 * "crossClass" otherwise. Used for labeling (e.g. the final skill sheet), NOT for the actual
 * max-rank number — see `skillMaxRank`, which needs the specific level(s) a class was active to
 * get the cap right, since the level+3 bonus doesn't retroactively apply using a later level.
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

export function skillPointCost(ranks: number, status: SkillStatus): number {
  if (status === "unavailable") return Infinity;
  return status === "class" ? ranks : ranks * 2;
}

/**
 * Highest rank a character could legally have in a skill by `uptoLevel`, given the actual level
 * progression. The level+3 class-skill cap is earned at the specific level where the class taken
 * THAT level grants the skill — it isn't retroactively applied using a later character level just
 * because some other class happened to grant it once. Once earned it's a permanent floor (ranks
 * already bought stay valid), but it doesn't keep climbing with character level unless the skill
 * is class-status again at a later level. A skill that's merely cross-class-available still gets
 * the standard floor((level+3)/2) cap, which does grow every level regardless of class history.
 *
 * Example: a skill that's a class skill only at levels 15 and 17 of a level-20 build caps at
 * 17+3=20, not 20+3=23 — the character never had that class active at level 20 to earn the 23.
 */
export function skillMaxRank(skillName: string, levels: LevelEntry[], uptoLevel: number): number {
  let sawAnyClass = false;
  let allUnavailable = true;
  let bestClassCap = 0;
  for (const entry of levels) {
    if (entry.level > uptoLevel) break;
    if (!entry.className) continue;
    sawAnyClass = true;
    const status = skillStatusForClass(skillName, entry.className);
    if (status !== "unavailable") allUnavailable = false;
    if (status === "class") bestClassCap = Math.max(bestClassCap, entry.level + 3);
  }
  if (sawAnyClass && allUnavailable) return 0;
  return Math.max(bestClassCap, Math.floor((uptoLevel + 3) / 2));
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
