import type { Build } from "../types";

/**
 * Feats every PoTM character is granted automatically, without spending a feat slot, and the
 * planner should treat as always-present. Two sources:
 *
 *   1. Server defaults — Knockdown and Disarm are standard combat maneuvers PoTM hands to every
 *      PC regardless of class, so feats that build on them (Improved Knockdown, Improved Disarm)
 *      should never flag a missing prerequisite.
 *   2. Class features that ARE a specific feat — taking a level of certain classes grants a fixed
 *      feat automatically (Bard → Bard Song, Barbarian → Barbarian Rage, Druid 5 → Wild Shape,
 *      Cleric → Turn Undead, ...). These aren't a free feat choice, so the player never adds them
 *      by hand, yet other feats list them as prerequisites (Extra Music needs Bard Song, Blazing
 *      Berserker needs Barbarian Rage, Hands of a Healer needs Lay on Hands, and so on).
 *
 * Because these are automatic, they must NOT be counted against a level's earned feat slots — this
 * data only feeds prerequisite checking, never the feat-budget math in the calculator.
 */

/** Feats granted to every PoTM character at creation, independent of class. */
export const DEFAULT_GRANTED_FEATS = ["Knockdown", "Disarm"] as const;

export interface ClassGrantedFeat {
  /** Relative level within the class (1 = the first level taken in that class) it's granted at. */
  classLevel: number;
  feat: string;
}

/**
 * Feats automatically granted by reaching a relative level in a class. A feat can be granted by
 * more than one class (Wild Shape from Druid 5 or Shifter 1; Turn Undead from Cleric 1 or the
 * level-3 divine prestige-ish classes) — the earliest qualifying class wins. Levels here mirror
 * the class-based prerequisites those same feats carry in featPrereqs.ts, so the two stay in sync.
 */
export const CLASS_GRANTED_FEATS: Record<string, ClassGrantedFeat[]> = {
  Bard: [{ classLevel: 1, feat: "Bard Song" }],
  Barbarian: [{ classLevel: 1, feat: "Barbarian Rage" }],
  Druid: [{ classLevel: 5, feat: "Wild Shape" }],
  Shifter: [{ classLevel: 1, feat: "Wild Shape" }],
  Cleric: [{ classLevel: 1, feat: "Turn Undead" }],
  Paladin: [
    { classLevel: 1, feat: "Lay on Hands" },
    { classLevel: 2, feat: "Aura of Courage" },
    { classLevel: 2, feat: "Detect Evil" },
    { classLevel: 3, feat: "Turn Undead" },
  ],
  Blackguard: [
    { classLevel: 1, feat: "Detect Good" },
    { classLevel: 3, feat: "Turn Undead" },
  ],
  "Monster Hunter": [{ classLevel: 3, feat: "Turn Undead" }],
  Hexblade: [{ classLevel: 1, feat: "Hexblade's Curse" }],
};

/**
 * Names of every feat automatically granted to `build` by the given character level (inclusive) —
 * server defaults plus any class feature whose relative-level threshold is met by then. Used by the
 * prerequisite engine so dependent feats see these as already taken.
 */
export function grantedFeatNamesThroughLevel(build: Build, atLevel: number): Set<string> {
  const names = new Set<string>(DEFAULT_GRANTED_FEATS);
  const classCounts: Record<string, number> = {};
  for (const entry of build.levels) {
    if (entry.level > atLevel || !entry.className) continue;
    classCounts[entry.className] = (classCounts[entry.className] ?? 0) + 1;
  }
  for (const [className, count] of Object.entries(classCounts)) {
    for (const rule of CLASS_GRANTED_FEATS[className] ?? []) {
      if (count >= rule.classLevel) names.add(rule.feat);
    }
  }
  return names;
}
