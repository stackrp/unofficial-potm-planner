import { FEAT_PREREQS } from "../data/featPrereqs";
import { categoryForRace } from "../data/raceCategories";
import { CLASSES } from "../data/classes";
import { applyAbilityDeltas, babAtLevel, racialAbilityAdjustments } from "./calculator";
import type { AbilityKey, AbilityScores, Build } from "../types";

function abilityScoresThroughLevel(build: Build, atLevel: number): AbilityScores {
  // Same stack as finalAbilityScores: pure point-buy + base auto + subrace extra + template,
  // then only ability increases taken on or before atLevel.
  const scores = applyAbilityDeltas(
    build.baseAbilityScores,
    racialAbilityAdjustments(build.race, build.template)
  );
  for (const entry of build.levels) {
    if (entry.level <= atLevel && entry.abilityIncrease) {
      scores[entry.abilityIncrease] += 1;
    }
  }
  return scores;
}

function classLevelsThroughLevel(build: Build, atLevel: number): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of build.levels) {
    if (entry.level > atLevel) continue;
    if (entry.className) counts[entry.className] = (counts[entry.className] ?? 0) + 1;
  }
  return counts;
}

function babThroughLevel(build: Build, atLevel: number): number {
  const counts = classLevelsThroughLevel(build, atLevel);
  return Object.entries(counts).reduce((sum, [cls, lvl]) => {
    const def = CLASSES[cls];
    return def ? sum + babAtLevel(def.babRate, lvl) : sum;
  }, 0);
}

function skillRanksThroughLevel(build: Build, atLevel: number): Record<string, number> {
  const ranks: Record<string, number> = {};
  for (const alloc of build.skills) {
    if (alloc.level > atLevel) continue;
    ranks[alloc.skillName] = (ranks[alloc.skillName] ?? 0) + alloc.ranks;
  }
  return ranks;
}

/**
 * Human-readable descriptions of `featName`'s unmet prerequisites, as of `atLevel` — empty if all
 * structured prerequisites are met, or if we have no prerequisite data for this feat (vanilla
 * feats and a handful of PoTM feats without a wiki page yet). Free-text `notes` in the data
 * (things this planner can't mechanically verify, like race or class-ability requirements) are
 * never included here since we can't know whether they're met.
 */
export function checkFeatPrereqs(build: Build, featName: string, atLevel: number): string[] {
  const prereq = FEAT_PREREQS[featName];
  if (!prereq) return [];
  const unmet: string[] = [];

  if (prereq.maxCharacterLevel != null && atLevel > prereq.maxCharacterLevel) {
    unmet.push(`character level ${prereq.maxCharacterLevel} or earlier (currently planned for level ${atLevel})`);
  }

  if (prereq.minBAB != null) {
    const bab = babThroughLevel(build, atLevel);
    if (bab < prereq.minBAB) unmet.push(`Base Attack Bonus +${prereq.minBAB} (currently +${bab})`);
  }

  if (prereq.abilityScores) {
    const scores = abilityScoresThroughLevel(build, atLevel);
    for (const [key, min] of Object.entries(prereq.abilityScores)) {
      const cur = scores[key as AbilityKey];
      if (min != null && cur < min) unmet.push(`${key} ${min}+ (currently ${cur})`);
    }
  }

  if (prereq.skillRanks) {
    const ranksByName = skillRanksThroughLevel(build, atLevel);
    for (const { skill, ranks } of prereq.skillRanks) {
      const cur = ranksByName[skill] ?? 0;
      if (cur < ranks) unmet.push(`${skill} ${ranks} ranks (currently ${cur})`);
    }
  }

  const featsSoFar = new Set(build.feats.filter((f) => f.level <= atLevel).map((f) => f.name));

  if (prereq.requiredFeats) {
    for (const name of prereq.requiredFeats) {
      if (!featsSoFar.has(name)) unmet.push(`${name} feat`);
    }
  }

  if (prereq.anyOfFeats && prereq.anyOfFeats.length > 0) {
    if (!prereq.anyOfFeats.some((name) => featsSoFar.has(name))) {
      unmet.push(`one of: ${prereq.anyOfFeats.join(", ")}`);
    }
  }

  const classesSoFar = classLevelsThroughLevel(build, atLevel);

  if (prereq.requiredClass) {
    const { className, level } = prereq.requiredClass;
    const have = classesSoFar[className] ?? 0;
    if (level != null ? have < level : have < 1) {
      unmet.push(level ? `${className} level ${level} (currently ${have})` : `${className} class`);
    }
  }

  if (prereq.requiredClassAnyOf && prereq.requiredClassAnyOf.length > 0) {
    const metAny = prereq.requiredClassAnyOf.some(({ className, level }) => {
      const have = classesSoFar[className] ?? 0;
      return level != null ? have >= level : have >= 1;
    });
    if (!metAny) {
      const options = prereq.requiredClassAnyOf
        .map(({ className, level }) => (level ? `${className} ${level}` : className))
        .join(" or ");
      unmet.push(`one of: ${options}`);
    }
  }

  if (prereq.requiredRaceCategoryAnyOf && prereq.requiredRaceCategoryAnyOf.length > 0) {
    const category = categoryForRace(build.race);
    if (!category || !prereq.requiredRaceCategoryAnyOf.includes(category)) {
      unmet.push(`race: ${prereq.requiredRaceCategoryAnyOf.join(" or ")}`);
    }
  }

  return unmet;
}
