import { ALL_SKILLS } from "./skills";

/**
 * Base NWN game feats, from nwn.fandom.com/wiki/Category:General_feats (which itself has
 * Category:Metamagic_feats and Category:First_level_feats as subcategories — exactly the three
 * groups here). Deliberately excludes Category:Epic_feats (not allowed on PoTM) and feats that are
 * only reachable via class/prestige-class categories (PoTM's own class feats already cover that
 * ground via ../data/feats.ts). PoTM may still restrict individual feats below with no published
 * list of which, so this is a name/category reference for the picker, not a guarantee of legality.
 *
 * Automatic Quicken/Silent/Still Spell are excluded even though the wiki tags them Metamagic, not
 * Epic — they require 21st level, which is epic-tier and off the table per the same rule.
 *
 * Skill Focus and Spell Focus/Greater Spell Focus are chosen-subtype feats in NWN (e.g. "Skill
 * Focus: Lore", "Spell Focus: Evocation") rather than standalone feats, so each is expanded into
 * one entry per skill/school below instead of listed once generically. Named "Name: Subtype" to
 * match the convention prestigePrereqs.ts already uses for these.
 */
export interface VanillaFeatDef {
  name: string;
  category: "General" | "Metamagic" | "First Level";
}

/** The 8 arcane/divine schools of magic used for Spell Focus and Greater Spell Focus. */
export const SPELL_SCHOOLS = [
  "Abjuration", "Conjuration", "Divination", "Enchantment",
  "Evocation", "Illusion", "Necromancy", "Transmutation",
] as const;

const group = (category: VanillaFeatDef["category"], names: string[]): VanillaFeatDef[] =>
  names.map((name) => ({ name, category }));

const generalBase = [
  "Alertness", "Ambidexterity", "Arcane Defense", "Armor Proficiency (Heavy)",
  "Armor Proficiency (Light)", "Armor Proficiency (Medium)", "Blind Fight", "Brew Potion",
  "Called Shot", "Circle Kick", "Cleave", "Combat Casting", "Craft Wand", "Curse Song",
  "Deflect Arrows", "Dirty Fighting", "Disarm", "Divine Might", "Divine Shield", "Dodge",
  "Expertise", "Extra Music", "Extra Smiting", "Extra Stunning Attacks", "Extra Turning",
  "Great Cleave", "Great Fortitude", "Greater Spell Penetration",
  "Improved Critical", "Improved Disarm", "Improved Expertise", "Improved Initiative",
  "Improved Knockdown", "Improved Parry", "Improved Power Attack", "Improved Two-Weapon Fighting",
  "Improved Unarmed Strike", "Iron Will", "Knockdown", "Lightning Reflexes", "Lingering Song",
  "Mobility", "Mount Actions", "Mounted Archery", "Mounted Combat", "Point Blank Shot",
  "Power Attack", "Rapid Reload", "Rapid Shot", "Resist Disease", "Resist Energy",
  "Resist Poison", "Sap", "Scribe Scroll", "Shield Proficiency",
  "Spell Penetration", "Spring Attack", "Stealthy", "Stunning Fist", "Thug", "Toughness",
  "Two-Weapon Fighting", "Weapon Finesse", "Weapon Focus", "Weapon Proficiency (Exotic)",
  "Weapon Proficiency (Martial)", "Weapon Proficiency (Simple)", "Weapon Specialization",
  "Whirlwind Attack", "Zen Archery",
  ...ALL_SKILLS.map((s) => `Skill Focus: ${s.name}`),
  ...SPELL_SCHOOLS.map((s) => `Spell Focus: ${s}`),
  ...SPELL_SCHOOLS.map((s) => `Greater Spell Focus: ${s}`),
].sort((a, b) => a.localeCompare(b));

export const VANILLA_FEATS: VanillaFeatDef[] = [
  ...group("General", generalBase),
  ...group("Metamagic", [
    "Empower Spell", "Extend Spell", "Maximize Spell", "Quicken Spell", "Silent Spell", "Still Spell",
  ]),
  ...group("First Level", [
    "Artist", "Blooded", "Bullheaded", "Courteous Magocracy", "Luck of Heroes", "Silver Palm",
    "Snake Blood", "Strong Soul",
  ]),
];

export const VANILLA_FEATS_BY_NAME: Map<string, VanillaFeatDef> = new Map(
  VANILLA_FEATS.map((f) => [f.name, f])
);
