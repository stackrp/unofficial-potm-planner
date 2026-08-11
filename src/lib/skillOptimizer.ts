import { ALL_SKILLS } from "../data/skills";
import type { LevelEntry, SkillAllocation } from "../types";
import type { LevelSnapshot } from "./calculator";
import { nextClassSkillLevel, skillMaxRank, skillStatusForClass } from "./skillRules";

export type SkillPriority = "primary" | "secondary";

export interface SkillOptimizerOptions {
  levels: LevelEntry[];
  perLevel: LevelSnapshot[];
  /** Selection order matters within each priority group: earlier entries are funded first
   * when the budget can't cover everything. */
  primarySkills: string[];
  secondarySkills: string[];
  /** Once selected skills are fully funded, spend any remaining points on other available
   * skills too, instead of leaving them banked at the end of the build. */
  dumpLeftover: boolean;
  /** Optional per-skill rank cap (skillName -> desired rank) for skills the user doesn't want
   * maxed out. Silently clamped to the skill's natural best-achievable rank if higher. Skills
   * without an entry here are targeted at their natural max. */
  caps?: Record<string, number>;
}

export interface SkillOptimizerSkillResult {
  skillName: string;
  priority: SkillPriority;
  /** Best rank this skill could ever reach in this build, by the final level. */
  target: number;
  achieved: number;
  fullyFunded: boolean;
}

export interface SkillOptimizerResult {
  allocations: SkillAllocation[];
  perSkill: SkillOptimizerSkillResult[];
  totalAvailable: number;
  totalSpent: number;
  endBanked: number;
}

function costPerRank(status: "class" | "crossClass" | "unavailable"): number {
  return status === "class" ? 1 : 2;
}

export function optimizeSkills(opts: SkillOptimizerOptions): SkillOptimizerResult {
  const { levels, perLevel, primarySkills, secondarySkills, dumpLeftover, caps } = opts;
  const priorityOrder = [...primarySkills, ...secondarySkills];
  const priorityOf: Record<string, SkillPriority> = {};
  for (const name of primarySkills) priorityOf[name] = "primary";
  for (const name of secondarySkills) priorityOf[name] = "secondary";

  if (levels.length === 0) {
    return { allocations: [], perSkill: [], totalAvailable: 0, totalSpent: 0, endBanked: 0 };
  }

  const finalLevel = levels[levels.length - 1].level;
  const targetFor = (skillName: string) => {
    const naturalMax = skillMaxRank(skillName, levels, finalLevel);
    const cap = caps?.[skillName];
    return cap != null && cap >= 0 ? Math.min(cap, naturalMax) : naturalMax;
  };

  const bought: Record<string, number> = {};
  const allocationsByLevel: Record<number, Record<string, number>> = {};
  let banked = 0;

  const dumpCandidates = ALL_SKILLS.filter((def) => !priorityOf[def.name]);

  for (let i = 0; i < levels.length; i++) {
    const entry = levels[i];
    const snap = perLevel[i];
    let budget = banked + (snap?.skillPointsGained ?? 0);
    const deltas: Record<string, number> = {};

    const spend = (skillName: string, cap: number, target: number) => {
      const status = skillStatusForClass(skillName, entry.className);
      if (status === "unavailable") return;
      const remaining = Math.min(target, cap) - (bought[skillName] ?? 0);
      if (remaining <= 0) return;

      const cheaperLater = status === "crossClass" && nextClassSkillLevel(skillName, levels, entry.level) != null;
      if (cheaperLater && entry.level !== finalLevel) return;

      const perRank = costPerRank(status);
      const buy = Math.min(remaining, Math.floor(budget / perRank));
      if (buy <= 0) return;
      bought[skillName] = (bought[skillName] ?? 0) + buy;
      budget -= buy * perRank;
      deltas[skillName] = (deltas[skillName] ?? 0) + buy;
    };

    for (const skillName of priorityOrder) {
      const cap = skillMaxRank(skillName, levels, entry.level);
      spend(skillName, cap, targetFor(skillName));
    }

    if (dumpLeftover && budget > 0) {
      for (const def of dumpCandidates) {
        if (budget <= 0) break;
        const cap = skillMaxRank(def.name, levels, entry.level);
        spend(def.name, cap, cap);
      }
    }

    banked = budget;
    if (Object.keys(deltas).length > 0) allocationsByLevel[entry.level] = deltas;
  }

  const allocations: SkillAllocation[] = [];
  for (const [levelStr, deltas] of Object.entries(allocationsByLevel)) {
    const level = Number(levelStr);
    for (const [skillName, ranks] of Object.entries(deltas)) {
      allocations.push({ level, skillName, ranks });
    }
  }

  const perSkill: SkillOptimizerSkillResult[] = priorityOrder.map((skillName) => {
    const target = targetFor(skillName);
    const achieved = bought[skillName] ?? 0;
    return { skillName, priority: priorityOf[skillName], target, achieved, fullyFunded: achieved >= target };
  });

  const totalAvailable = perLevel.reduce((s, l) => s + l.skillPointsGained, 0);

  return { allocations, perSkill, totalAvailable, totalSpent: totalAvailable - banked, endBanked: banked };
}
