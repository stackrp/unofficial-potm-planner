import { CLASSES, type BabRate } from "../data/classes";
import { ALL_SKILLS, SKILL_NAMES } from "../data/skills";
import type { SkillStatus } from "../data/skills";
import { getRace } from "../data/races";
import { categoryForRace } from "../data/raceCategories";
import { getBackground, MAX_BACKGROUNDS } from "../data/backgrounds";
import { getDeity } from "../data/deities";
import { withinOneStep } from "./alignment";
import { skillMaxRank, skillPointCost, skillStatusForBuild } from "./skillRules";
import {
  ABILITY_KEYS,
  SAVE_BONUS_FEATS,
  type AbilityKey,
  type AbilityScores,
  type Build,
} from "../types";

const ALL_SKILLS_BY_NAME = Object.fromEntries(ALL_SKILLS.map((s) => [s.name, s]));

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Point-buy cost table used by the original planner: 8-14 cost 1pt/rank, 15-16 cost 2pt/rank, 17-18 cost 3pt/rank. */
export function pointBuyCost(scores: AbilityScores): number {
  let total = 0;
  for (const key of ABILITY_KEYS) {
    const s = scores[key];
    total += s - 8;
    if (s > 14) total += s - 14;
    if (s > 16) total += s - 16;
  }
  return total;
}

export function pointBuyIsValid(scores: AbilityScores): boolean {
  return ABILITY_KEYS.every((k) => scores[k] >= 8 && scores[k] <= 18);
}

function goodSave(level: number): number {
  return level <= 0 ? 0 : Math.floor(level / 2) + 2;
}

function poorSave(level: number): number {
  return level <= 0 ? 0 : Math.floor(level / 3);
}

function babAtLevel(rate: BabRate, level: number): number {
  if (level <= 0) return 0;
  switch (rate) {
    case "full":
      return level;
    case "threeQuarter":
      return Math.floor((3 * level) / 4);
    case "half":
      return Math.floor(level / 2);
  }
}

export interface LevelSnapshot {
  level: number;
  className: string;
  hp: number;
  bab: number;
  skillPointsGained: number;
  featsGained: number;
  fort: number;
  ref: number;
  will: number;
}

export interface BuildTotals {
  hp: number;
  bab: number;
  skillPoints: number;
  feats: number;
  fort: number;
  ref: number;
  will: number;
  finalAbilityScores: AbilityScores;
  abilityModifiers: Record<AbilityKey, number>;
}

export interface SkillSnapshot {
  name: string;
  status: SkillStatus;
  ranks: number;
  maxRank: number;
  pointCost: number;
  totalModifier: number;
}

export interface CalculatedBuild {
  perLevel: LevelSnapshot[];
  totals: BuildTotals;
  skills: SkillSnapshot[];
  errors: string[];
}

/** Final ability scores after all level-up increases (every 4 char levels, one point each). */
export function finalAbilityScores(build: Build): AbilityScores {
  const scores = { ...build.baseAbilityScores };
  const race = getRace(build.race);
  if (race) {
    for (const [key, delta] of Object.entries(race.abilityAdjustments)) {
      scores[key as AbilityKey] += delta ?? 0;
    }
  }
  for (const entry of build.levels) {
    if (entry.abilityIncrease) {
      scores[entry.abilityIncrease] += 1;
    }
  }
  return scores;
}

export function calculateBuild(build: Build): CalculatedBuild {
  const errors: string[] = [];
  const finalScores = finalAbilityScores(build);
  const finalMods = Object.fromEntries(
    ABILITY_KEYS.map((k) => [k, abilityModifier(finalScores[k])])
  ) as Record<AbilityKey, number>;

  const featCounts: Record<string, number> = {};
  for (const f of build.feats) {
    featCounts[f.name] = (featCounts[f.name] ?? 0) + 1;
  }

  const isHumanRace = categoryForRace(build.race) === "Humans";
  const conMod = finalMods.CON;

  const classLevelCounts: Record<string, number> = {};
  let runningIntScore = build.baseAbilityScores.INT;
  const perLevel: LevelSnapshot[] = [];

  for (const entry of build.levels) {
    const classDef = CLASSES[entry.className];
    if (!classDef) {
      errors.push(`Level ${entry.level}: unknown class "${entry.className}"`);
      continue;
    }

    if (entry.abilityIncrease === "INT") {
      runningIntScore += 1;
    }
    const intModAtLevel = abilityModifier(runningIntScore);

    classLevelCounts[entry.className] = (classLevelCounts[entry.className] ?? 0) + 1;
    const relLevel = classLevelCounts[entry.className];

    // HP: max hit die every level (NWN convention) + CON mod (applied retroactively,
    // matching NWN's own behavior of recalculating HP off current CON) + Toughness.
    const toughnessBonus = featCounts["Toughness"] ? 1 : 0;
    const hp = classDef.hitDie + conMod + toughnessBonus;

    // BAB: total = sum over each class of babAtLevel(rate, levels-in-that-class).
    const bab = Object.entries(classLevelCounts).reduce((sum, [cls, lvl]) => {
      const def = CLASSES[cls];
      return def ? sum + babAtLevel(def.babRate, lvl) : sum;
    }, 0);

    // Skill points: class base + INT mod + human bonus, x4 at character level 1, floor of 1.
    const humanBonus = isHumanRace ? 1 : 0;
    let skillPointsGained = classDef.skillPoints + intModAtLevel + humanBonus;
    if (entry.level === 1) skillPointsGained *= 4;
    skillPointsGained = Math.max(1, skillPointsGained);

    // Feats: universal level-1 feat, human bonus feat (level 1), every-3rd-character-level
    // bonus feat, plus this class's own bonus feat schedule at its relative level.
    let featsGained = 0;
    if (entry.level === 1) featsGained += 1 + humanBonus;
    if (entry.level % 3 === 0) featsGained += 1;
    featsGained += classDef.bonusFeatsByLevel[relLevel - 1] ?? 0;

    // Saves: sum of each class's own good/poor progression at its relative level.
    let fort = 0;
    let ref = 0;
    let will = 0;
    for (const [cls, lvl] of Object.entries(classLevelCounts)) {
      const def = CLASSES[cls];
      if (!def) continue;
      fort += def.saves.fort ? goodSave(lvl) : poorSave(lvl);
      ref += def.saves.ref ? goodSave(lvl) : poorSave(lvl);
      will += def.saves.will ? goodSave(lvl) : poorSave(lvl);
    }

    perLevel.push({
      level: entry.level,
      className: entry.className,
      hp,
      bab,
      skillPointsGained,
      featsGained,
      fort,
      ref,
      will,
    });
  }

  const last = perLevel[perLevel.length - 1];
  const totalHp = perLevel.reduce((s, l) => s + l.hp, 0);
  const totalSkillPoints = perLevel.reduce((s, l) => s + l.skillPointsGained, 0);
  const totalFeats = perLevel.reduce((s, l) => s + l.featsGained, 0);

  // Feat-based save bonuses (Great Fortitude, Luck of Heroes, etc.)
  let featFort = 0;
  let featRef = 0;
  let featWill = 0;
  for (const [name, bonuses] of Object.entries(SAVE_BONUS_FEATS)) {
    if (!featCounts[name]) continue;
    featFort += bonuses.fort ?? 0;
    featRef += bonuses.ref ?? 0;
    featWill += bonuses.will ?? 0;
  }

  // Class special abilities: Paladin Divine Grace, Blackguard Dark Blessing,
  // Divine Champion Sacred Defense (bug-fixed: applies equally to all three saves).
  const paladinLevels = classLevelCounts["Paladin"] ?? 0;
  const blackguardLevels = classLevelCounts["Blackguard"] ?? 0;
  const divineChampionLevels = classLevelCounts["Divine Champion"] ?? 0;

  let classFort = 0;
  let classRef = 0;
  let classWill = 0;
  if (paladinLevels > 0) {
    classFort += finalMods.CHA;
    classRef += finalMods.CHA;
    classWill += finalMods.CHA;
  }
  if (blackguardLevels > 1) {
    classFort += finalMods.CHA;
    classRef += finalMods.CHA;
    classWill += finalMods.CHA;
  }
  const sacredDefense = Math.floor(divineChampionLevels / 2);
  classFort += sacredDefense;
  classRef += sacredDefense;
  classWill += sacredDefense;

  const totals: BuildTotals = {
    hp: totalHp,
    bab: last?.bab ?? 0,
    skillPoints: totalSkillPoints,
    feats: totalFeats,
    fort: (last?.fort ?? 0) + finalMods.CON + featFort + classFort,
    ref: (last?.ref ?? 0) + finalMods.DEX + featRef + classRef,
    will: (last?.will ?? 0) + finalMods.WIS + featWill + classWill,
    finalAbilityScores: finalScores,
    abilityModifiers: finalMods,
  };

  // Ability point-up validation: 1 point every 4 levels.
  const expectedAbilityIncreases = Math.floor(build.levels.length / 4);
  const actualAbilityIncreases = build.levels.filter((l) => l.abilityIncrease).length;
  if (actualAbilityIncreases !== expectedAbilityIncreases) {
    errors.push(
      `Expected ${expectedAbilityIncreases} ability score increase(s) by level ${build.levels.length}, got ${actualAbilityIncreases}.`
    );
  }
  for (const entry of build.levels) {
    if (entry.abilityIncrease && entry.level % 4 !== 0) {
      errors.push(`Ability increase at level ${entry.level} — increases only happen every 4 levels.`);
    }
  }

  const classNamesTaken = Object.keys(classLevelCounts);
  const totalLevel = build.levels.length;
  const allocationByName = new Map(build.skills.map((s) => [s.skillName, s.ranks]));

  const selectedBackgrounds = build.backgrounds.filter((b) => b !== "");
  const backgroundBonuses: Record<string, number> = {};
  for (const bgName of selectedBackgrounds) {
    const bg = getBackground(bgName);
    if (!bg) continue;
    for (const skillName of bg.skillBonuses) {
      backgroundBonuses[skillName] = (backgroundBonuses[skillName] ?? 0) + 1;
    }
  }
  if (selectedBackgrounds.length > MAX_BACKGROUNDS) {
    errors.push(`${selectedBackgrounds.length} backgrounds selected — only ${MAX_BACKGROUNDS} are allowed.`);
  }

  if (build.deity.hasDeity && build.deity.deityName && build.alignment) {
    const deityDef = getDeity(build.deity.pantheon, build.deity.deityName);
    if (deityDef?.alignment && !withinOneStep(build.alignment, deityDef.alignment)) {
      errors.push(
        `Alignment ${build.alignment} is more than one step from ${deityDef.name}'s alignment (${deityDef.alignment}).`
      );
    }
  }

  const skills: SkillSnapshot[] = SKILL_NAMES.map((name) => {
    const status = skillStatusForBuild(name, classNamesTaken);
    const ranks = allocationByName.get(name) ?? 0;
    const maxRank = skillMaxRank(totalLevel, status);
    const pointCost = skillPointCost(ranks, status);
    const skillDef = ALL_SKILLS_BY_NAME[name];
    const abilityMod = skillDef ? finalMods[skillDef.ability] : 0;
    const backgroundBonus = backgroundBonuses[name] ?? 0;
    return { name, status, ranks, maxRank, pointCost, totalModifier: ranks + abilityMod + backgroundBonus };
  });

  const totalSkillSpent = skills.reduce((s, sk) => s + (Number.isFinite(sk.pointCost) ? sk.pointCost : 0), 0);
  if (totalSkillSpent > totalSkillPoints) {
    errors.push(`Skill points overspent: ${totalSkillSpent} spent, ${totalSkillPoints} available.`);
  }
  for (const sk of skills) {
    if (sk.status === "unavailable" && sk.ranks > 0) {
      errors.push(`${sk.name}: not available to any class in this build, but has ${sk.ranks} rank(s) assigned.`);
    } else if (sk.ranks > sk.maxRank) {
      errors.push(`${sk.name}: ${sk.ranks} ranks exceeds the max of ${sk.maxRank} at level ${totalLevel}.`);
    }
  }

  return { perLevel, totals, skills, errors };
}
