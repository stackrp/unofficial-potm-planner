import raw from "./classAbilities.json";

export interface ClassAbility {
  /** Relative level within this class (1 = first level taken in this class), not character level. */
  level: number;
  title: string;
  description: string;
}

export const CLASS_ABILITIES: Record<string, ClassAbility[]> = raw as Record<string, ClassAbility[]>;

export function abilitiesForClass(className: string): ClassAbility[] {
  return CLASS_ABILITIES[className] ?? [];
}
