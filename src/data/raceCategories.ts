import raw from "./raceCategories.json";
import { SETTING_ORDER, settingForRace, type Setting } from "./raceSettings";
import type { AbilityKey } from "../types";

// NWN's character creation only offers 7 base races; every subrace is a PW-applied
// template layered on top of one of them. The first entry in each category is that
// base race's own default Ravenloft subrace (no template applied). "Templates" (e.g.
// Draconic Ancestry, Feytouched) are a separate, orthogonal overlay — a character can
// have a template AND a subrace — and live in data/templates.ts instead.
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

// Base race automatic ability modifiers (what NWN applies at character creation).
// `abilityAdjustments` on each races.json entry only holds a subrace's own extra bonus on top
// of these — never repeats the base mod. Stacked with subrace extras (and templates) in
// finalAbilityScores; baseAbilityScores stay pure 8–18 point-buy.
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

export interface SettingGroup {
  setting: Setting;
  races: string[];
}

/**
 * The category's subraces (excluding its own default/no-subrace entry), grouped by
 * campaign setting and alphabetized within each group. Groups are ordered per
 * SETTING_ORDER. A race missing from raceSettings.json falls back into "Multiple
 * Settings" rather than being silently dropped.
 */
export function subracesForCategoryGroupedBySetting(category: string): SettingGroup[] {
  const defaultRace = defaultRaceForCategory(category);
  const groups = new Map<Setting, string[]>();
  for (const name of subracesForCategory(category)) {
    if (name === defaultRace) continue;
    const setting = settingForRace(name) ?? "Multiple Settings";
    if (!groups.has(setting)) groups.set(setting, []);
    groups.get(setting)!.push(name);
  }
  for (const races of groups.values()) races.sort((a, b) => a.localeCompare(b));
  return SETTING_ORDER.filter((setting) => groups.has(setting)).map((setting) => ({
    setting,
    races: groups.get(setting)!,
  }));
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
