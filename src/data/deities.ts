import raw from "./deities.json";
import { splitWeaponAlternatives } from "./favoredWeapons";

export interface DeityDef {
  name: string;
  altName: string | null;
  gender: string | null;
  domains: string[];
  alignment: string | null;
  favoredWeapon: string | null;
  /** favoredWeapon split into individual options, e.g. "Battleaxe or Longsword" -> both. */
  weaponAlternatives: string[];
  symbol: string | null;
  portfolio: string[];
  subgroup: string | null;
  pantheon: string;
}

interface RawPantheon {
  pantheon: string;
  section: string;
  deities: Omit<DeityDef, "pantheon" | "weaponAlternatives">[];
}

const RAW_PANTHEONS = raw as RawPantheon[];

// The Ravenloft native pantheon plus every Outlander D&D-setting and Gothic Earth
// mythological pantheon recognized on PotM. Flattened to one deity list; `pantheon`
// traces each entry back to its source table, and `subgroup` preserves finer groupings
// some pantheons use internally (e.g. "The Gods of Light" within Dragonlance Deities).
export const DEITIES: DeityDef[] = RAW_PANTHEONS.flatMap((p) =>
  p.deities.map((d) => ({
    ...d,
    pantheon: p.pantheon,
    weaponAlternatives: splitWeaponAlternatives(d.favoredWeapon ?? ""),
  }))
);

const DEITIES_BY_KEY = new Map(DEITIES.map((d) => [`${d.pantheon}::${d.name}`, d]));

export function getDeity(pantheon: string, name: string): DeityDef | undefined {
  return DEITIES_BY_KEY.get(`${pantheon}::${name}`);
}

/** Deities whose domain list contains every domain in `domains`, and whose weapon
 * alternatives include `weapon` (when given). Empty/falsy filters are ignored. */
export function deitiesMatching(domains: string[], weapon?: string): DeityDef[] {
  return DEITIES.filter(
    (d) =>
      domains.every((dom) => d.domains.includes(dom)) &&
      (!weapon || d.weaponAlternatives.includes(weapon))
  );
}

/** Union of domains (or weapon alternatives) offered across a set of deities, sorted. */
export function unionDomains(deities: DeityDef[]): string[] {
  return [...new Set(deities.flatMap((d) => d.domains))].sort();
}

export function unionWeapons(deities: DeityDef[]): string[] {
  return [...new Set(deities.flatMap((d) => d.weaponAlternatives))].sort();
}
