export type AbilityKey = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

export const ABILITY_KEYS: AbilityKey[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export interface AbilityScores {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

export interface LevelEntry {
  /** 1-indexed character level */
  level: number;
  className: string;
  /** Ability score increased at this level, only set on levels divisible by 4 */
  abilityIncrease?: AbilityKey;
}

export interface FeatEntry {
  level: number;
  name: string;
}

/** Ranks purchased AT this specific level (a delta, not a running total) — lets the planner
 * price each rank using the class/cross-class status you actually had at that level, and show
 * where banking points for a later, cheaper level pays off. */
export interface SkillAllocation {
  level: number;
  skillName: string;
  ranks: number;
}

export interface DeitySelection {
  hasDeity: boolean;
  /** Whether the picker shows conventional deities or Voodan loa patrons. */
  patronType: "god" | "loa";
  pantheon: string;
  deityName: string;
  /** Fixed-length slots (empty string = unfilled) — see BackgroundPicker for why. */
  domains: string[];
  /** Prefilled from the deity on selection, but editable (some deities list alternates). Gods only — loa have no favored weapon. */
  favoredWeapon: string;
}

export const ALIGNMENTS = ["LG", "NG", "CG", "LN", "TN", "CN", "LE", "NE", "CE"] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

export interface Build {
  name: string;
  race: string;
  /** Name of a TemplateDef applied on top of race/subrace, or "" for none — see data/templates.ts. */
  template: string;
  alignment: string;
  baseAbilityScores: AbilityScores;
  levels: LevelEntry[];
  feats: FeatEntry[];
  skills: SkillAllocation[];
  backgrounds: string[];
  deity: DeitySelection;
}

export const SAVE_BONUS_FEATS: Record<string, Partial<Record<"fort" | "ref" | "will", number>>> = {
  "Great Fortitude": { fort: 2 },
  "Lightning Reflexes": { ref: 2 },
  "Iron Will": { will: 2 },
  "Luck of Heroes": { fort: 1, ref: 1, will: 1 },
  "Strong Soul": { fort: 1, will: 1 },
  "Disciplined Mind": { will: 1 },
};

export const FIRST_LEVEL_ONLY_FEATS = new Set(["Luck of Heroes", "Strong Soul"]);
