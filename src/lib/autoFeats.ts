import { AUTO_CLASS_FEATS, UNIVERSAL_AUTO_FEATS } from "../data/autoFeats";
import type { LevelEntry } from "../types";

export interface GrantedFeat {
  characterLevel: number;
  className: string;
  /** Relative level within `className` this feat came from — 0 for universal (non-class) grants. */
  classLevel: number;
  featName: string;
}

/**
 * Every feat automatically granted through `levels`, in build order — the universal level-1
 * feats (Knockdown, Disarm) plus each class's own automatic class-feature feats from
 * `AUTO_CLASS_FEATS`. These never consume a feat slot; they exist so the planner can recognize
 * them as already-owned when checking another feat's prerequisites, and so the UI can show them.
 */
export function grantedFeats(levels: LevelEntry[]): GrantedFeat[] {
  const result: GrantedFeat[] = [];
  const classLevelCounts: Record<string, number> = {};

  for (const entry of levels) {
    if (entry.level === 1) {
      for (const featName of UNIVERSAL_AUTO_FEATS) {
        result.push({ characterLevel: 1, className: entry.className, classLevel: 0, featName });
      }
    }

    if (!entry.className) continue;
    classLevelCounts[entry.className] = (classLevelCounts[entry.className] ?? 0) + 1;
    const relLevel = classLevelCounts[entry.className];

    for (const grant of AUTO_CLASS_FEATS[entry.className] ?? []) {
      if (grant.level === relLevel) {
        result.push({
          characterLevel: entry.level,
          className: entry.className,
          classLevel: relLevel,
          featName: grant.featName,
        });
      }
    }
  }

  return result;
}

/** Names of every feat automatically granted at or before `atLevel` — for prerequisite checks. */
export function grantedFeatNamesThroughLevel(levels: LevelEntry[], atLevel: number): Set<string> {
  return new Set(grantedFeats(levels).filter((g) => g.characterLevel <= atLevel).map((g) => g.featName));
}
