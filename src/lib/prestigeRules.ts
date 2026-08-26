import type { Build } from "../types";
import { categoryForRace } from "../data/raceCategories";
import { grantedFeatNamesThroughLevel } from "../data/grantedFeats";
import {
  ALIGNMENT_REQUIREMENT_LABELS,
  ARCANE_CASTER_CLASSES,
  PRESTIGE_PREREQS,
  type AlignmentRequirement,
} from "../data/prestigePrereqs";
import type { LevelSnapshot } from "./calculator";

export interface RequirementCheck {
  label: string;
  met: boolean;
}

export interface PrestigeEvaluation {
  className: string;
  displayName: string;
  requiresApplication: boolean;
  available: boolean;
  takenAtLevel: number;
  levelsTaken: number;
  meetsAllChecked: boolean;
  checks: RequirementCheck[];
  manualNotes: string[];
  sourceUrl: string;
}

function alignmentSatisfies(req: AlignmentRequirement, alignment: string): boolean {
  if (!alignment) return false;
  const isTrueNeutral = alignment === "TN";
  const law = isTrueNeutral ? "N" : alignment[0];
  const good = isTrueNeutral ? "N" : alignment[1];
  switch (req) {
    case "any-good":
      return good === "G";
    case "any-evil":
      return good === "E";
    case "any-lawful":
      return law === "L";
    case "true-neutral":
      return isTrueNeutral;
    case "non-chaotic-non-evil":
      return law !== "C" && good !== "E";
    case "any-non-good":
      return good !== "G";
  }
}

/** Only prestige classes present in the build's level plan are evaluated. */
export function evaluatePrestigeClasses(build: Build, perLevel: LevelSnapshot[]): PrestigeEvaluation[] {
  const results: PrestigeEvaluation[] = [];
  const seen = new Set<string>();

  for (const [firstIndex, entry] of build.levels.entries()) {
    if (seen.has(entry.className)) continue;
    const prereq = PRESTIGE_PREREQS[entry.className];
    if (!prereq) continue;
    seen.add(entry.className);

    const takenAtLevel = entry.level;
    const levelsTaken = build.levels.filter((l) => l.className === entry.className).length;

    const babBefore = firstIndex > 0 ? perLevel[firstIndex - 1]?.bab ?? 0 : 0;

    // Include feats granted for free by this level — PoTM defaults (Knockdown, Disarm) and
    // class features that are a fixed feat (Bard Song, Wild Shape, Turn Undead, ...) — so a
    // prestige requirement like Dirgist's "Bard Song" is met by a Bard level without the player
    // manually adding the auto-granted feat.
    const featsKnown = new Set(
      build.feats.filter((f) => f.level <= takenAtLevel).map((f) => f.name.trim().toLowerCase())
    );
    for (const name of grantedFeatNamesThroughLevel(build, takenAtLevel)) {
      featsKnown.add(name.trim().toLowerCase());
    }

    // Levels in OTHER classes accumulated strictly before this class's own entry level.
    const priorClassLevelCounts: Record<string, number> = {};
    for (const lvl of build.levels) {
      if (lvl.level >= takenAtLevel) break;
      priorClassLevelCounts[lvl.className] = (priorClassLevelCounts[lvl.className] ?? 0) + 1;
    }

    const checks: RequirementCheck[] = [];

    if (prereq.alignment) {
      checks.push({
        label: `Alignment: ${ALIGNMENT_REQUIREMENT_LABELS[prereq.alignment]}`,
        met: alignmentSatisfies(prereq.alignment, build.alignment),
      });
    }

    if (prereq.raceCategories) {
      const category = categoryForRace(build.race);
      checks.push({
        label: `Race: ${prereq.raceCategories.join(" or ")}`,
        met: !!category && prereq.raceCategories.includes(category),
      });
    }

    if (prereq.minBab != null) {
      checks.push({
        label: `Base Attack Bonus +${prereq.minBab} before this class`,
        met: babBefore >= prereq.minBab,
      });
    }

    for (const featReq of prereq.feats ?? []) {
      const met = featReq.anyOf.some((f) => featsKnown.has(f.trim().toLowerCase()));
      checks.push({ label: `Feat: ${featReq.anyOf.join(" or ")}`, met });
    }

    for (const skillReq of prereq.skills ?? []) {
      const ranks = build.skills
        .filter((s) => s.skillName === skillReq.skill && s.level <= takenAtLevel)
        .reduce((sum, s) => sum + s.ranks, 0);
      checks.push({
        label: `${skillReq.skill} ${skillReq.ranks}+ ranks by level ${takenAtLevel}`,
        met: ranks >= skillReq.ranks,
      });
    }

    for (const clReq of prereq.classLevels ?? []) {
      const met = clReq.anyOf.some((c) => (priorClassLevelCounts[c.className] ?? 0) >= c.min);
      checks.push({
        label: `Class level: ${clReq.anyOf.map((c) => `${c.className} ${c.min}+`).join(" or ")}`,
        met,
      });
    }

    if (prereq.arcaneLevelsAtLeast != null) {
      const total = ARCANE_CASTER_CLASSES.reduce((s, c) => s + (priorClassLevelCounts[c] ?? 0), 0);
      checks.push({
        label: `${prereq.arcaneLevelsAtLeast}+ levels in an arcane spellcasting class`,
        met: total >= prereq.arcaneLevelsAtLeast,
      });
    }

    checks.push({
      label: "5+ levels planned in this class (server minimum)",
      met: levelsTaken >= 5,
    });

    results.push({
      className: entry.className,
      displayName: prereq.displayName,
      requiresApplication: prereq.requiresApplication,
      available: prereq.available,
      takenAtLevel,
      levelsTaken,
      meetsAllChecked: checks.every((c) => c.met),
      checks,
      manualNotes: prereq.manualNotes ?? [],
      sourceUrl: prereq.sourceUrl,
    });
  }

  return results.sort((a, b) => a.takenAtLevel - b.takenAtLevel);
}
