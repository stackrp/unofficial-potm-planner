import raw from "./races.json";
import type { AbilityKey } from "../types";

export interface RaceDef {
  name: string;
  abilityAdjustments: Partial<Record<AbilityKey, number>>;
  effectiveCharacterLevel: number | null;
  baseOutcastRating: number | null;
  traits: string[];
  notes: string[];
}

// Ability adjustments here are the SUBRACE'S OWN extra bonus only — never the base race's
// automatic chargen mod (Elf +2 Dex/−2 Con, etc.). Base auto-mods live in BASE_RACE_AUTO_MOD
// (raceCategories.ts) and are stacked with these extras in finalAbilityScores. Many subrace
// notes document the split: engine applies the base mod at character creation, then the
// remainder when the subrace template is granted in-game.
export const RACES: RaceDef[] = raw as RaceDef[];

const RACES_BY_NAME = new Map(RACES.map((r) => [r.name, r]));

export function getRace(name: string): RaceDef | undefined {
  return RACES_BY_NAME.get(name);
}
