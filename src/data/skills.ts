import classSkillsRaw from "./classSkills.json";
import type { AbilityKey } from "../types";

export interface SkillDef {
  name: string;
  ability: AbilityKey;
  trainedOnly: boolean;
  armorCheckPenalty: boolean;
  /** Notes on how POTM's ruleset changed this skill from vanilla NWN. */
  note?: string;
}

// Sourced from the NWN Ravenloft: Prisoners of the Mist wiki's Skills page and each
// skill's own page (nwn.fandom.com for unmodified skills, nwnravenloft.fandom.com for
// PW-custom ones). Craft Armor/Trap/Weapons, Ride, Bluff, Persuade, Taunt, Intimidate,
// and Pick Pocket are disabled or merged into other skills on this server and are
// intentionally excluded here.
export const ALL_SKILLS: SkillDef[] = [
  { name: "Animal Empathy", ability: "CHA", trainedOnly: true, armorCheckPenalty: false, note: "Functions as a combat ability (usable every 3 rounds), not a check." },
  { name: "Antagonize", ability: "CHA", trainedOnly: false, armorCheckPenalty: false, note: "Combines Taunt and Intimidate." },
  { name: "Appraise", ability: "INT", trainedOnly: false, armorCheckPenalty: false },
  { name: "Concentration", ability: "CON", trainedOnly: false, armorCheckPenalty: false },
  { name: "Disable Trap", ability: "INT", trainedOnly: true, armorCheckPenalty: false },
  { name: "Discipline", ability: "STR", trainedOnly: false, armorCheckPenalty: false },
  { name: "Disguise", ability: "CHA", trainedOnly: false, armorCheckPenalty: false },
  { name: "Heal", ability: "WIS", trainedOnly: false, armorCheckPenalty: false },
  { name: "Hide", ability: "DEX", trainedOnly: false, armorCheckPenalty: true },
  { name: "Influence", ability: "CHA", trainedOnly: false, armorCheckPenalty: false, note: "Combines Bluff and Persuade." },
  { name: "Listen", ability: "WIS", trainedOnly: false, armorCheckPenalty: false },
  { name: "Lore", ability: "INT", trainedOnly: false, armorCheckPenalty: false },
  { name: "Move Silently", ability: "DEX", trainedOnly: false, armorCheckPenalty: true },
  { name: "Open Lock", ability: "DEX", trainedOnly: true, armorCheckPenalty: false },
  { name: "Parry", ability: "DEX", trainedOnly: false, armorCheckPenalty: true },
  { name: "Perform", ability: "CHA", trainedOnly: false, armorCheckPenalty: false, note: "All classes have access on this server." },
  { name: "Search", ability: "INT", trainedOnly: false, armorCheckPenalty: false },
  { name: "Set Trap", ability: "DEX", trainedOnly: true, armorCheckPenalty: false },
  { name: "Sleight of Hand", ability: "DEX", trainedOnly: true, armorCheckPenalty: true, note: "Replaces Pick Pocket." },
  { name: "Speak Language", ability: "INT", trainedOnly: false, armorCheckPenalty: false },
  { name: "Spellcraft", ability: "INT", trainedOnly: true, armorCheckPenalty: false },
  { name: "Spot", ability: "WIS", trainedOnly: false, armorCheckPenalty: false },
  { name: "Tumble", ability: "DEX", trainedOnly: true, armorCheckPenalty: true },
  { name: "Use Magic Device", ability: "CHA", trainedOnly: true, armorCheckPenalty: false },
];

export const SKILL_NAMES = ALL_SKILLS.map((s) => s.name);

interface RawClassSkills {
  classSkills: string[];
  unavailable: string[];
}

const classSkillsRawTyped = classSkillsRaw as Record<string, RawClassSkills>;

export type SkillStatus = "class" | "crossClass" | "unavailable";

/** A skill is usable at all for a build if at least one taken class allows it (not unavailable for that class). */
export function classSkillSet(className: string): { classSkills: Set<string>; unavailable: Set<string> } {
  const entry = classSkillsRawTyped[className];
  return {
    classSkills: new Set(entry?.classSkills ?? []),
    unavailable: new Set(entry?.unavailable ?? []),
  };
}
