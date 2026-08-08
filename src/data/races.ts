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

// Ability adjustments here are the TOTAL once the subrace is acquired in-game; many
// subraces note the game engine auto-applies the base race's adjustment at character
// creation and the remainder is added when the subrace template is granted in-game —
// see each race's `notes` for the exact breakdown.
export const RACES: RaceDef[] = raw as RaceDef[];

const RACES_BY_NAME = new Map(RACES.map((r) => [r.name, r]));

export function getRace(name: string): RaceDef | undefined {
  return RACES_BY_NAME.get(name);
}
