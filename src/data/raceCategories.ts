import raw from "./raceCategories.json";
import type { AbilityKey } from "../types";

// NWN's character creation only offers 7 base races; every subrace is a PW-applied
// template layered on top of one of them. The first entry in each category is that
// base race's own default Ravenloft subrace (no template applied). "Templates" are a
// separate, orthogonal overlay (a character can have a template AND a subrace) and are
// intentionally not included here.
export const BASE_RACE_CATEGORIES = [
  "Dwarves",
  "Elves",
  "Gnomes",
  "Half-Elves",
  "Halflings",
  "Half-Orcs",
  "Humans",
] as const;

type RaceCategoryMap = Record<string, string[]>;
const CATEGORIES = raw as RaceCategoryMap;

// The NWN engine bakes each base race's ability modifier into the score you spend point-buy
// points on — you never see or pay for the pre-racial value. `abilityAdjustments` on each race
// entry only ever holds a subrace's own extra bonus (see races.json), so this is the one place
// that still records the base race's own auto-mod. Used both to back out the free bonus before
// checking the point-buy budget, and to auto-shift the ability score panel when the player picks
// a race, so they see the same numbers the real character creation screen would show them.
export const BASE_RACE_AUTO_MOD: Record<string, Partial<Record<AbilityKey, number>>> = {
  Dwarves: { CON: 2, CHA: -2 },
  Elves: { DEX: 2, CON: -2 },
  Gnomes: { CON: 2, STR: -2 },
  "Half-Elves": {},
  Halflings: { DEX: 2, STR: -2 },
  "Half-Orcs": { STR: 2, INT: -2, CHA: -2 },
  Humans: {},
};

/** The base race's automatic ability modifier for `raceName`'s category, or `{}` if none. */
export function autoModForRace(raceName: string): Partial<Record<AbilityKey, number>> {
  const category = categoryForRace(raceName);
  return (category && BASE_RACE_AUTO_MOD[category]) || {};
}

export function subracesForCategory(category: string): string[] {
  return CATEGORIES[category] ?? [];
}

/** The category's own base race (no subrace template applied) — always the first entry. */
export function defaultRaceForCategory(category: string): string | undefined {
  return CATEGORIES[category]?.[0];
}

/** Reverse lookup: which base race category a given race/subrace name belongs to. */
export function categoryForRace(raceName: string): string | undefined {
  for (const category of BASE_RACE_CATEGORIES) {
    if (CATEGORIES[category]?.includes(raceName)) return category;
  }
  return undefined;
}
