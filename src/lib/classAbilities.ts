import { abilitiesForClass } from "../data/classAbilities";
import type { LevelEntry } from "../types";

export interface GainedAbility {
  characterLevel: number;
  className: string;
  title: string;
  description: string;
}

/**
 * Flattens each level's class pick into the class features it grants at that point, in build
 * order. Uses the class's own relative level (1st, 2nd, ... level taken in that class) to index
 * into its ability list — same convention as `bonusFeatsByLevel` in classes.json.
 */
export function abilitiesGainedThroughBuild(levels: LevelEntry[]): GainedAbility[] {
  const classLevelCounts: Record<string, number> = {};
  const gained: GainedAbility[] = [];

  for (const entry of levels) {
    if (!entry.className) continue;
    classLevelCounts[entry.className] = (classLevelCounts[entry.className] ?? 0) + 1;
    const relLevel = classLevelCounts[entry.className];

    for (const ability of abilitiesForClass(entry.className)) {
      if (ability.level !== relLevel) continue;
      gained.push({
        characterLevel: entry.level,
        className: entry.className,
        title: ability.title,
        description: ability.description,
      });
    }
  }

  return gained;
}
