import { CLASSES, type BabRate } from "../data/classes";
import { ALL_SKILLS, SKILL_NAMES } from "../data/skills";
import type { SkillStatus } from "../data/skills";
import { getRace } from "../data/races";
import { autoModForRace, categoryForRace } from "../data/raceCategories";
import { getTemplate } from "../data/templates";
import { getBackground, MAX_BACKGROUNDS } from "../data/backgrounds";
import { getDeity } from "../data/deities";
import { withinOneStep } from "./alignment";
import {
  skillMaxRank,
  skillPointCost,
  skillStatusForClass,
  skillStatusForMaxRank,
} from "./skillRules";
import {
  ABILITY_KEYS,
  FIRST_LEVEL_ONLY_FEATS,
  SAVE_BONUS_FEATS,
  type AbilityKey,
  type AbilityScores,
  type Build,
  type SkillAllocation,
} from "../types";

const ALL_SKILLS_BY_NAME = Object.fromEntries(ALL_SKILLS.map((s) => [s.name, s]));

export const POINT_BUY_BUDGET = 30;

/**
 * Hard cap on class levels (hit dice) a PC can take in NWN/PoTM. Effective Character Level
 * from race/subrace + template reduces how many of those levels remain available:
 * max class levels = ABSOLUTE_LEVEL_CAP − total ECL.
 */
export const ABSOLUTE_LEVEL_CAP = 20;

/** Combined ECL from race/subrace and template (null treated as 0). */
export function totalEcl(race: string, template = ""): number {
  const raceEcl = getRace(race)?.effectiveCharacterLevel ?? 0;
  const templateEcl = getTemplate(template)?.effectiveCharacterLevel ?? 0;
  return raceEcl + templateEcl;
}

/** Max class levels this race/template combination may take (never below 0). */
export function maxClassLevels(race: string, template = ""): number {
  return Math.max(0, ABSOLUTE_LEVEL_CAP - totalEcl(race, template));
}

/**
 * If `build.levels` exceeds the ECL-adjusted cap, drop the excess tail and any skill/feat
 * allocations that pointed at removed levels. Returns the same object when already within cap.
 */
export function trimBuildToLevelCap(build: Build): Build {
  const cap = maxClassLevels(build.race, build.template);
  if (build.levels.length <= cap) return build;
  return {
    ...build,
    levels: build.levels.slice(0, cap),
    skills: build.skills.filter((s) => s.level <= cap),
    feats: build.feats.filter((f) => f.level <= cap),
  };
}

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

/**
 * Combined free ability adjustments for a race/subrace + optional template:
 * base race auto-mod (e.g. Elf +2 Dex/-2 Con) + subrace extra (races.json) + template.
 * `baseAbilityScores` are pure point-buy and must not include these.
 */
export function racialAbilityAdjustments(
  race: string,
  template = ""
): Partial<Record<AbilityKey, number>> {
  const total: Partial<Record<AbilityKey, number>> = { ...autoModForRace(race) };
  const raceDef = getRace(race);
  if (raceDef) {
    for (const [key, delta] of Object.entries(raceDef.abilityAdjustments)) {
      total[key as AbilityKey] = (total[key as AbilityKey] ?? 0) + (delta ?? 0);
    }
  }
  const templateDef = getTemplate(template);
  if (templateDef) {
    for (const [key, delta] of Object.entries(templateDef.abilityAdjustments)) {
      total[key as AbilityKey] = (total[key as AbilityKey] ?? 0) + (delta ?? 0);
    }
  }
  return total;
}

/** Apply `deltas` onto a copy of `scores` (missing keys treated as 0). */
export function applyAbilityDeltas(
  scores: AbilityScores,
  deltas: Partial<Record<AbilityKey, number>>
): AbilityScores {
  const next = { ...scores };
  for (const [key, delta] of Object.entries(deltas)) {
    next[key as AbilityKey] += delta ?? 0;
  }
  return next;
}

function goodSave(level: number): number {
  return level <= 0 ? 0 : Math.floor(level / 2) + 2;
}

function poorSave(level: number): number {
  return level <= 0 ? 0 : Math.floor(level / 3);
}

export function babAtLevel(rate: BabRate, level: number): number {
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
  /** Skill points actually spent (at this level's class/cross-class prices) on allocations made at this level. */
  skillPointsSpent: number;
  /** Running unspent skill point balance after this level — negative means overspent. */
  skillPointsBanked: number;
  featsGained: number;
  fort: number;
  ref: number;
  will: number;
}

export interface BuildTotals {
  hp: number;
  bab: number;
  skillPoints: number;
  /** Unspent skill points left over at the build's final level. */
  skillPointsBanked: number;
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

/**
 * Final ability scores: pure point-buy base + base-race auto-mod + subrace extra + template
 * + level-up increases (every 4 char levels, one point each).
 */
export function finalAbilityScores(build: Build): AbilityScores {
  const scores = applyAbilityDeltas(
    build.baseAbilityScores,
    racialAbilityAdjustments(build.race, build.template)
  );
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

  // Humans are handled specially: a Human with no subrace gets the level-1 bonus feat AND +1
  // skill point every level. A Human subrace (Axani, Tiefling, etc.) still gets the level-1
  // bonus feat, and one extra skill point, but only that one — no ongoing +1/level after that.
  const isHumanRace = categoryForRace(build.race) === "Humans";
  const isHumanNoSubrace = build.race === "Humans";
  const isHumanWithSubrace = isHumanRace && !isHumanNoSubrace;
  // A template that changes creature type away from Humanoid (currently only Feytouched) strips
  // the Human bonus skill point but leaves the level-1 bonus feat untouched — see templates.ts.
  const humanSkillPointBonusRemoved = getTemplate(build.template)?.removesHumanSkillPointBonus ?? false;
  const conMod = finalMods.CON;

  const classLevelCounts: Record<string, number> = {};
  // baseAbilityScores are pure point-buy. Base-race auto-mod (e.g. Half-Orc -2 Int) is known at
  // chargen and counts from level 1. A subrace's own extra INT (races.json abilityAdjustments)
  // isn't applied until the subrace template is picked in-game — after character creation (level
  // 1) but before level 2 — so level 1's skill points are locked in at pre-subrace INT, and only
  // level 2 onward should see that bump. Skill points aren't retroactively recalculated in NWN
  // when an ability score changes later, unlike e.g. HP off current CON. Racial templates
  // (templates.ts) deliberately aren't folded into this running score — unlike a subrace's fixed
  // "before level 2" grant, a template is only granted whenever its Community Council application
  // is approved, which this planner has no way to place on the level timeline. Their ability
  // adjustments still show up in finalAbilityScores (the end-state sheet) — just not here.
  const raceDef = getRace(build.race);
  const baseAutoInt = autoModForRace(build.race).INT ?? 0;
  let runningIntScore = build.baseAbilityScores.INT + baseAutoInt;
  let subraceIntApplied = false;
  const perLevel: LevelSnapshot[] = [];

  // Skill points are priced using the class taken at the level they were spent (NWN prices
  // class vs cross-class off that level's class alone), then tracked as a running banked
  // balance so a plan can show when banking for a cheaper level pays off. Max ranks use the
  // any-class rule (class skill for any taken class → level+3 cap).
  const skillAllocationsByLevel = new Map<number, SkillAllocation[]>();
  for (const alloc of build.skills) {
    const arr = skillAllocationsByLevel.get(alloc.level) ?? [];
    arr.push(alloc);
    skillAllocationsByLevel.set(alloc.level, arr);
  }
  const skillRanksSoFar: Record<string, number> = {};
  const skillCostSoFar: Record<string, number> = {};
  let bankedSkillPoints = 0;

  function spendSkillPointsAtLevel(levelNum: number, classNameAtLevel: string): number {
    let spent = 0;
    for (const alloc of skillAllocationsByLevel.get(levelNum) ?? []) {
      if (alloc.ranks <= 0) continue;
      // Cost/availability: only the class leveled this level.
      const costStatus = skillStatusForClass(alloc.skillName, classNameAtLevel);
      if (costStatus === "unavailable") {
        errors.push(
          classNameAtLevel
            ? `Level ${levelNum}: ${alloc.skillName} is unavailable when leveling ${classNameAtLevel}.`
            : `Level ${levelNum}: ${alloc.skillName} can't be bought with no class chosen at this level.`
        );
      }
      const cost = skillPointCost(alloc.ranks, costStatus);
      const finiteCost = Number.isFinite(cost) ? cost : alloc.ranks * 2;
      spent += finiteCost;
      skillRanksSoFar[alloc.skillName] = (skillRanksSoFar[alloc.skillName] ?? 0) + alloc.ranks;
      skillCostSoFar[alloc.skillName] = (skillCostSoFar[alloc.skillName] ?? 0) + finiteCost;

      // Max ranks: the level+3 class cap is earned at the specific level(s) the skill was
      // actually a class skill, not retroactively via a later level in an unrelated class.
      const maxAtLevel = skillMaxRank(alloc.skillName, build.levels, levelNum);
      if (skillRanksSoFar[alloc.skillName] > maxAtLevel) {
        errors.push(
          `Level ${levelNum}: ${alloc.skillName} reaches ${skillRanksSoFar[alloc.skillName]} ranks, exceeding the max of ${maxAtLevel} at that level.`
        );
      }
    }
    return spent;
  }

  for (const entry of build.levels) {
    if (!entry.className) {
      const prev = perLevel[perLevel.length - 1];
      const spentThisLevel = spendSkillPointsAtLevel(entry.level, "");
      bankedSkillPoints -= spentThisLevel;
      if (bankedSkillPoints < 0) {
        errors.push(`Level ${entry.level}: spent more skill points than banked.`);
      }
      perLevel.push({
        level: entry.level,
        className: "",
        hp: 0,
        bab: prev?.bab ?? 0,
        skillPointsGained: 0,
        skillPointsSpent: spentThisLevel,
        skillPointsBanked: bankedSkillPoints,
        featsGained: 0,
        fort: prev?.fort ?? 0,
        ref: prev?.ref ?? 0,
        will: prev?.will ?? 0,
      });
      continue;
    }

    const classDef = CLASSES[entry.className];
    if (!classDef) {
      errors.push(`Level ${entry.level}: unknown class "${entry.className}"`);
      continue;
    }

    if (entry.level > 1 && !subraceIntApplied) {
      runningIntScore += raceDef?.abilityAdjustments.INT ?? 0;
      subraceIntApplied = true;
    }
    if (entry.abilityIncrease === "INT") {
      runningIntScore += 1;
    }
    const intModAtLevel = abilityModifier(runningIntScore);

    classLevelCounts[entry.className] = (classLevelCounts[entry.className] ?? 0) + 1;
    const relLevel = classLevelCounts[entry.className];
    if (relLevel > classDef.maxLevel) {
      errors.push(`Level ${entry.level}: ${entry.className} ${relLevel} exceeds its ${classDef.maxLevel}-level cap.`);
    }

    // HP: max hit die every level (NWN convention) + CON mod (applied retroactively,
    // matching NWN's own behavior of recalculating HP off current CON) + Toughness.
    const toughnessBonus = featCounts["Toughness"] ? 1 : 0;
    const hp = classDef.hitDie + conMod + toughnessBonus;

    // BAB: total = sum over each class of babAtLevel(rate, levels-in-that-class).
    const bab = Object.entries(classLevelCounts).reduce((sum, [cls, lvl]) => {
      const def = CLASSES[cls];
      return def ? sum + babAtLevel(def.babRate, lvl) : sum;
    }, 0);

    // Skill points: class base + INT mod + human bonus, x4 at character level 1, floor of 1. Only
    // a subrace-less Human keeps earning the +1/level bonus; a Human subrace only ever gets it
    // once, added as a flat point after the level-1 x4 multiplier (see isHumanWithSubrace above).
    const humanPerLevelSkillBonus = isHumanNoSubrace && !humanSkillPointBonusRemoved ? 1 : 0;
    let skillPointsGained = classDef.skillPoints + intModAtLevel + humanPerLevelSkillBonus;
    if (entry.level === 1) {
      skillPointsGained *= 4;
      if (isHumanWithSubrace && !humanSkillPointBonusRemoved) skillPointsGained += 1;
    }
    skillPointsGained = Math.max(1, skillPointsGained);

    // Feats: universal level-1 feat, human bonus feat (level 1), every-3rd-character-level
    // bonus feat, plus this class's own bonus feat schedule at its relative level.
    const humanFeatBonus = isHumanRace ? 1 : 0;
    let featsGained = 0;
    if (entry.level === 1) featsGained += 1 + humanFeatBonus;
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

    const skillPointsSpent = spendSkillPointsAtLevel(entry.level, entry.className);
    bankedSkillPoints += skillPointsGained - skillPointsSpent;
    if (bankedSkillPoints < 0) {
      errors.push(`Level ${entry.level}: spent more skill points than earned + banked.`);
    }

    perLevel.push({
      level: entry.level,
      className: entry.className,
      hp,
      bab,
      skillPointsGained,
      skillPointsSpent,
      skillPointsBanked: bankedSkillPoints,
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

  if (build.feats.length > totalFeats) {
    errors.push(`${build.feats.length} feats added but only ${totalFeats} earned by this build.`);
  }
  for (const f of build.feats) {
    if (FIRST_LEVEL_ONLY_FEATS.has(f.name) && f.level !== 1) {
      errors.push(`${f.name} can only be taken at level 1 (added at level ${f.level}).`);
    }
  }

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
    skillPointsBanked: last?.skillPointsBanked ?? 0,
    feats: totalFeats,
    fort: (last?.fort ?? 0) + finalMods.CON + featFort + classFort,
    ref: (last?.ref ?? 0) + finalMods.DEX + featRef + classRef,
    will: (last?.will ?? 0) + finalMods.WIS + featWill + classWill,
    finalAbilityScores: finalScores,
    abilityModifiers: finalMods,
  };

  const abilityPointsSpent = pointBuyCost(build.baseAbilityScores);
  if (abilityPointsSpent > POINT_BUY_BUDGET) {
    errors.push(`Ability scores cost ${abilityPointsSpent} points, exceeding the ${POINT_BUY_BUDGET}-point budget.`);
  }

  // Class-level cap: 20 − (race/subrace ECL + template ECL). ECL 1 → 19 levels, ECL 2 → 18, etc.
  const ecl = totalEcl(build.race, build.template);
  const classLevelCap = maxClassLevels(build.race, build.template);
  if (build.levels.length > classLevelCap) {
    errors.push(
      ecl > 0
        ? `Build has ${build.levels.length} class levels but ECL +${ecl} caps this character at ${classLevelCap} (absolute cap ${ABSOLUTE_LEVEL_CAP}).`
        : `Build has ${build.levels.length} class levels, exceeding the ${ABSOLUTE_LEVEL_CAP}-level cap.`
    );
  }

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

  // Ranks and cost come from the per-level ledger above (skillRanksSoFar/skillCostSoFar), which
  // prices each rank at the class taken when it was bought — not the final status — and already
  // validated overspending and max-rank-at-that-level in spendSkillPointsAtLevel(). The status
  // label uses the any-class rule (informational only); the actual cap uses the level(s) the
  // skill was really a class skill, so it matches NWN's real (non-retroactive) multiclass rule.
  const skills: SkillSnapshot[] = SKILL_NAMES.map((name) => {
    const status = skillStatusForMaxRank(name, classNamesTaken);
    const ranks = skillRanksSoFar[name] ?? 0;
    const maxRank = skillMaxRank(name, build.levels, totalLevel);
    const pointCost = skillCostSoFar[name] ?? 0;
    const skillDef = ALL_SKILLS_BY_NAME[name];
    const abilityMod = skillDef ? finalMods[skillDef.ability] : 0;
    const backgroundBonus = backgroundBonuses[name] ?? 0;
    return { name, status, ranks, maxRank, pointCost, totalModifier: ranks + abilityMod + backgroundBonus };
  });

  return { perLevel, totals, skills, errors };
}
