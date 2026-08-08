import raw from "./raceCategories.json";

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
