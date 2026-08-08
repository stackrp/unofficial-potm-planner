import raw from "./favoredWeapons.json";

// Derived from every distinct favoredWeapon value across the deity dataset (deities.json),
// splitting "X or Y" / "X, Y" alternates into individual options. Finite because the set of
// gods is finite — see data/deities.ts.
export const FAVORED_WEAPONS: string[] = raw as string[];

// A couple of source entries abbreviate the second alternate's word stem, e.g.
// "Great or Bastard Sword" meaning "Greatsword or Bastard Sword" — naive splitting on
// " or " would otherwise produce a bare "Great" fragment.
const ABBREVIATION_FIXUPS: Record<string, string> = {
  "Great or Bastard Sword": "Greatsword or Bastard Sword",
  "Long or Shortsword": "Longsword or Shortsword",
};

// Inconsistent capitalization in the source data for otherwise-identical weapons.
const CASING_FIXUPS: Record<string, string> = {
  "Short sword": "Shortsword",
  "Unarmed strike": "Unarmed Strike",
};

/** Split a deity's raw favoredWeapon string ("X or Y") into individual weapon options. */
export function splitWeaponAlternatives(raw: string): string[] {
  if (!raw) return [];
  const fixed = ABBREVIATION_FIXUPS[raw] ?? raw;
  return fixed
    .split(/\s+or\s+|,\s+/i)
    .map((part) => part.trim())
    .map((part) => CASING_FIXUPS[part] ?? part)
    .filter(Boolean);
}
