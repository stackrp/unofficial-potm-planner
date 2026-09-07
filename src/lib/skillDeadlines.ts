import { FEAT_PREREQS } from "../data/featPrereqs";
import { PRESTIGE_PREREQS } from "../data/prestigePrereqs";
import { ALL_SKILLS } from "../data/skills";
import type { Build } from "../types";

/**
 * "This skill needs `ranks` ranks bought by the time we take level `byLevel`" — a hard checkpoint
 * the skill optimizer must hit, derived from a prerequisite the build already commits to.
 *
 * `byLevel` is the character level at which the ranks must be in place. NWN counts ranks bought
 * *at* that level toward the prereq (both `checkFeatPrereqs` and `evaluatePrestigeClasses` use
 * `alloc.level <= takenAtLevel`), so a deadline is satisfied by allocations with `level <= byLevel`.
 */
export interface SkillDeadline {
  skill: string;
  ranks: number;
  byLevel: number;
  /** Human-readable origin, e.g. "Crypt Raider (prestige)" or "Expert Dungeoneer (feat)". */
  source: string;
}

const isRealSkill = (name: string) => ALL_SKILLS.some((s) => s.name === name);

/**
 * Every skill-rank checkpoint implied by the build's planned feats and the prestige classes in its
 * level plan. Feeds the optimizer so skills a feat/prestige entry depends on are funded to the
 * required rank by the required level, ahead of merely nice-to-have skills.
 */
export function deriveSkillDeadlines(build: Build): SkillDeadline[] {
  const out: SkillDeadline[] = [];

  for (const feat of build.feats) {
    const prereq = FEAT_PREREQS[feat.name];
    if (!prereq?.skillRanks) continue;
    for (const { skill, ranks } of prereq.skillRanks) {
      if (isRealSkill(skill)) out.push({ skill, ranks, byLevel: feat.level, source: `${feat.name} (feat)` });
    }
  }

  const seenClass = new Set<string>();
  for (const entry of build.levels) {
    if (!entry.className || seenClass.has(entry.className)) continue;
    seenClass.add(entry.className);
    const prereq = PRESTIGE_PREREQS[entry.className];
    if (!prereq?.skills) continue;
    for (const { skill, ranks } of prereq.skills) {
      if (isRealSkill(skill)) {
        out.push({ skill, ranks, byLevel: entry.level, source: `${prereq.displayName} (prestige)` });
      }
    }
  }

  return out.sort((a, b) => a.byLevel - b.byLevel || a.skill.localeCompare(b.skill));
}

/**
 * Collapses a list of deadlines (auto-derived + any the user added by hand) into the shape the
 * optimizer wants: `skillName -> [{ byLevel, ranks }]`, one entry per distinct `byLevel` keeping
 * the strongest rank requirement, sorted by level.
 */
export function toDeadlineMap(
  deadlines: Array<{ skill: string; ranks: number; byLevel: number }>,
): Record<string, { byLevel: number; ranks: number }[]> {
  const bySkill = new Map<string, Map<number, number>>();
  for (const { skill, ranks, byLevel } of deadlines) {
    if (ranks <= 0 || byLevel <= 0) continue;
    const perLevel = bySkill.get(skill) ?? new Map<number, number>();
    perLevel.set(byLevel, Math.max(perLevel.get(byLevel) ?? 0, ranks));
    bySkill.set(skill, perLevel);
  }
  const map: Record<string, { byLevel: number; ranks: number }[]> = {};
  for (const [skill, perLevel] of bySkill) {
    map[skill] = [...perLevel.entries()]
      .map(([byLevel, ranks]) => ({ byLevel, ranks }))
      .sort((a, b) => a.byLevel - b.byLevel);
  }
  return map;
}
