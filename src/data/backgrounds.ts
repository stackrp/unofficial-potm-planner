import raw from "./backgrounds.json";

export interface BackgroundDef {
  name: string;
  /** Two skills, each getting a flat +1. "Soft" bonus per the wiki — doesn't count
   * toward skill point cost, max rank, or whether a skill counts as trained. */
  skillBonuses: [string, string];
}

// Sourced from nwnravenloft.fandom.com/wiki/Backgrounds. Every character picks exactly two.
export const BACKGROUNDS: BackgroundDef[] = raw as BackgroundDef[];

export const BACKGROUND_NAMES: string[] = BACKGROUNDS.map((b) => b.name);

const BACKGROUNDS_BY_NAME = new Map(BACKGROUNDS.map((b) => [b.name, b]));

export function getBackground(name: string): BackgroundDef | undefined {
  return BACKGROUNDS_BY_NAME.get(name);
}

export const MAX_BACKGROUNDS = 2;

/** Every distinct skill that some background grants a +1 to, sorted alphabetically. */
export const BACKGROUND_SKILLS: string[] = [
  ...new Set(BACKGROUNDS.flatMap((b) => b.skillBonuses)),
].sort();
