import type { AbilityKey } from "../types";
import { ALL_SKILLS } from "./skills";
import { SPELL_SCHOOLS } from "./vanillaFeats";

/**
 * Prerequisites for PoTM feats, sourced from each feat's individual page on
 * nwnravenloft.fandom.com (via the wiki's API, batch-fetched by page title). Keyed by the exact
 * name strings used in `feats.ts`'s FEATS array. Coverage isn't exhaustive — a number of feats in
 * FEATS don't have a wiki page yet (the wiki's own Feats hub page admits several are still
 * missing), and some prerequisites reference things this planner can't mechanically verify (a
 * class ability rather than a feat, "ability to cast healing spells", etc.) — those are captured
 * in `notes` instead of the structured fields.
 */
export interface FeatPrereq {
  minBAB?: number;
  /** Feat can only be taken at this character level or earlier (e.g. background feats at level 1). */
  maxCharacterLevel?: number;
  abilityScores?: Partial<Record<AbilityKey, number>>;
  skillRanks?: { skill: string; ranks: number }[];
  /** All of these must already be taken. */
  requiredFeats?: string[];
  /** At least one of these must already be taken (e.g. "Barbarian Rage or Wolverine's Rage"). */
  anyOfFeats?: string[];
  requiredClass?: { className: string; level?: number };
  /** At least one of these class+level combos must be met. */
  requiredClassAnyOf?: { className: string; level?: number }[];
  /** At least one of these race categories (see raceCategories.ts) must match. */
  requiredRaceCategoryAnyOf?: string[];
  /** Free-text prerequisites this planner can't mechanically check — informational only. */
  notes?: string[];
}

/** Skill Focus is a chosen-subtype feat in NWN ("Skill Focus: Lore", etc.) — one entry per skill. */
const skillFocusPrereqs: Record<string, FeatPrereq> = Object.fromEntries(
  ALL_SKILLS.map((s) => [`Skill Focus: ${s.name}`, { notes: ["Must be able to use the skill"] }])
);

/** Spell Focus/Greater Spell Focus are also chosen-subtype feats — one entry per spell school. */
const spellFocusPrereqs: Record<string, FeatPrereq> = Object.fromEntries(
  SPELL_SCHOOLS.map((school) => [`Spell Focus: ${school}`, { notes: ["Ability to cast 1st-level spells"] }])
);
const greaterSpellFocusPrereqs: Record<string, FeatPrereq> = Object.fromEntries(
  SPELL_SCHOOLS.map((school) => [`Greater Spell Focus: ${school}`, { requiredFeats: [`Spell Focus: ${school}`] }])
);

export const FEAT_PREREQS: Record<string, FeatPrereq> = {
  ...skillFocusPrereqs,
  ...spellFocusPrereqs,
  ...greaterSpellFocusPrereqs,

  // --- Combat ---
  "Back to the Wall": { minBAB: 2 },
  "Crossbow Sniper": { minBAB: 1, requiredFeats: ["Weapon Focus"], notes: ["Weapon Focus with light or heavy crossbow"] },
  "Dead Eye": {
    minBAB: 14,
    abilityScores: { DEX: 17 },
    requiredFeats: ["Point Blank Shot", "Weapon Focus"],
    notes: ["Weapon Focus with any ranged weapon"],
  },
  "Improved Expertise": { minBAB: 6, abilityScores: { INT: 13 }, requiredFeats: ["Expertise"] },
  "Shield Parry": { abilityScores: { DEX: 15 }, requiredFeats: ["Shield Proficiency"] },

  // --- One-Handed Duelling ---
  "Bonetti's Defense": { abilityScores: { DEX: 12, INT: 13 }, requiredFeats: ["Expertise"] },
  "Thibault's Geometry": { minBAB: 6, abilityScores: { DEX: 14, INT: 13 }, requiredFeats: ["Bonetti's Defense"] },
  "Agrippa's Fundamental Guards": {
    minBAB: 11,
    abilityScores: { DEX: 16, INT: 14 },
    requiredFeats: ["Thibault's Geometry"],
  },

  // --- Two-Weapon Defense ---
  "Two-Weapon Defense": {
    abilityScores: { DEX: 15 },
    requiredFeats: ["Two-Weapon Fighting"],
    notes: ["Rangers may qualify via Dual-Wield instead of Two-Weapon Fighting"],
  },
  "Improved Two-Weapon Defense": {
    minBAB: 6,
    abilityScores: { DEX: 17 },
    requiredFeats: ["Two-Weapon Defense"],
  },
  "Greater Two-Weapon Defense": {
    minBAB: 11,
    abilityScores: { DEX: 19 },
    requiredFeats: ["Improved Two-Weapon Defense"],
  },

  // --- Firearm ---
  "Careful Handling": { requiredFeats: ["Weapon Proficiency (Exotic)"] },
  "Delven's Maneuver": {
    abilityScores: { DEX: 12 },
    requiredFeats: ["Weapon Focus"],
    notes: ["Weapon Focus (musket) or Weapon Focus (pistol)"],
  },
  "Gearling's Superposed Loading Technique": {
    abilityScores: { DEX: 14 },
    requiredFeats: ["Delven's Maneuver", "Weapon Focus"],
    notes: ["Weapon Focus (musket) or Weapon Focus (pistol)"],
  },

  // --- General ---
  "Battle Caster": { notes: ["Requires ability to ignore arcane spell failure chance from armor"] },
  "Clarity of Vision": { skillRanks: [{ skill: "Spot", ranks: 12 }] },
  "Cold Endurance": { notes: ["Requires a Fortitude save bonus of +2 or higher"] },
  Diehard: { requiredFeats: ["Endurance"] },
  "Expert Dungeoneer": { skillRanks: [{ skill: "Lore", ranks: 4 }] },
  "Filth Eater": { notes: ["Requires Resist Disease and Resist Poison"] },
  "Healing Hands": { skillRanks: [{ skill: "Heal", ranks: 5 }] },
  "Heat Endurance": { notes: ["Requires a Fortitude save bonus of +2 or higher"] },
  Muse: { abilityScores: { CHA: 14 }, notes: ["Can only be taken at 1st level"] },
  "Natural Healer": { requiredFeats: ["Endurance"] },
  "Opening Tap": { skillRanks: [{ skill: "Open Lock", ranks: 12 }] },
  "Rapid Reload": { minBAB: 2 },
  "Sand in the Eyes": {
    skillRanks: [{ skill: "Sleight of Hand", ranks: 8 }],
    anyOfFeats: ["Dirty Fighting", "Sneak Attack", "Death Attack"],
  },
  "Shrouded Dance": {
    skillRanks: [
      { skill: "Hide", ranks: 12 },
      { skill: "Perform", ranks: 10 },
    ],
    requiredFeats: ["Skill Focus: Hide", "Skill Focus: Perform"],
  },
  Trapmaster: { abilityScores: { INT: 13 }, notes: ["Requires Uncanny Dodge III (Rogue class ability)"] },
  "Warding Gesture": { abilityScores: { WIS: 11, CHA: 11 } },

  // --- Skill ---
  "No Identity": { notes: ["Can only be taken at 1st level"] },
  "Recognize Imposter": { skillRanks: [{ skill: "Spot", ranks: 3 }] },
  "Urban Stealth": {
    skillRanks: [
      { skill: "Lore", ranks: 5 },
      { skill: "Move Silently", ranks: 5 },
    ],
  },

  // --- Mercantile ---
  "Experienced Haggler": { skillRanks: [{ skill: "Appraise", ranks: 10 }], requiredFeats: ["Mercantile Aptitude"] },
  "Mercantile Aptitude": { skillRanks: [{ skill: "Appraise", ranks: 5 }] },
  "Seasoned Trader": { skillRanks: [{ skill: "Appraise", ranks: 15 }], requiredFeats: ["Experienced Haggler"] },

  // --- Outcast Rating ---
  "Sterling Reputation": { abilityScores: { CHA: 12 } },
  Unremarkable: { abilityScores: { CHA: 9 }, notes: ["Can only be taken at 1st or 2nd level"] },

  // --- Animal ---
  "Savage Empathy": { requiredFeats: ["Animal Empathy"] },
  "Shared Fury": {
    skillRanks: [{ skill: "Animal Empathy", ranks: 5 }],
    anyOfFeats: ["Barbarian Rage", "Wolverine's Rage"],
    notes: ["Also requires an Animal Companion"],
  },
  "Vermin Trainer": { requiredFeats: ["Animal Empathy"], notes: ["Requires Darkvision"] },

  // --- Racial ---
  "Battle Hardened (Dwarf)": { minBAB: 4, requiredRaceCategoryAnyOf: ["Dwarves"] },
  "Channeled Rage (Half-Orc)": { requiredFeats: ["Barbarian Rage"], requiredRaceCategoryAnyOf: ["Half-Orcs"] },
  "Death's Blood (Elf)": { requiredRaceCategoryAnyOf: ["Elves", "Half-Elves"] },
  "Menacing Demeanor (Half-Orc)": {
    requiredRaceCategoryAnyOf: ["Half-Orcs"],
    notes: ["Caliban, Orc blood, or Orc subtype"],
  },
  "Nimble (Halfling)": { requiredRaceCategoryAnyOf: ["Halflings"] },
  "Piercing Sight (Gnome)": { requiredRaceCategoryAnyOf: ["Gnomes"] },

  // --- Special ---
  "Empower Turning": {
    requiredClassAnyOf: [
      { className: "Cleric" },
      { className: "Blackguard" },
      { className: "Monster Hunter" },
      { className: "Paladin" },
      { className: "Shaman" },
      { className: "Voodan" },
    ],
  },
  "Improved Turning": {
    requiredClassAnyOf: [
      { className: "Cleric" },
      { className: "Blackguard" },
      { className: "Monster Hunter" },
      { className: "Paladin" },
      { className: "Voodan" },
    ],
  },
  "Martial Supremacy": { minBAB: 14, notes: ["Full BAB classes and Monks only"] },

  // --- Spellcasting ---
  "Augment Healing": { skillRanks: [{ skill: "Heal", ranks: 4 }], notes: ["Requires ability to cast healing spells"] },
  "Critical Spell Strike": { notes: ["Ability to cast 1st-level spells"] },
  "Misted Magic": { notes: ["Requires ability to cast 2nd-level spells"] },
  "Voice of Wrath": { notes: ["Requires ability to cast 1st-level spells"] },

  // --- Conjuration ---
  "Augment Elemental": { skillRanks: [{ skill: "Lore", ranks: 2 }], requiredFeats: ["Spell Focus: Conjuration"] },
  "Augment Summoning": { requiredFeats: ["Spell Focus: Conjuration"] },
  "Beckon the Frozen": { requiredFeats: ["Augment Summoning", "Spell Focus: Conjuration"] },

  // --- Necromancy ---
  "Bolster Resistance": { requiredFeats: ["Corpsecrafter"] },
  Corpsecrafter: { requiredFeats: ["Spell Focus: Necromancy"] },
  "Deadly Chill": { requiredFeats: ["Corpsecrafter"] },
  "Destruction Retribution": { requiredFeats: ["Corpsecrafter"] },
  "Hardened Flesh": { requiredFeats: ["Corpsecrafter"] },
  "Necromantic Might": { requiredFeats: ["Necromantic Presence", "Spell Focus: Necromancy"] },
  "Necromantic Presence": { requiredFeats: ["Spell Focus: Necromancy"] },
  "Nimble Bones": { requiredFeats: ["Corpsecrafter"] },

  // --- Turn Undead ---
  "Turn Undead": {
    requiredClassAnyOf: [
      { className: "Cleric", level: 1 },
      { className: "Monster Hunter", level: 3 },
      { className: "Paladin", level: 3 },
      { className: "Blackguard", level: 3 },
      { className: "Shaman", level: 3 },
    ],
  },
  "Aura of Life Energy": { skillRanks: [{ skill: "Lore", ranks: 7 }], requiredFeats: ["Turn Undead"] },
  "Death's Favor": { abilityScores: { CHA: 13 }, requiredFeats: ["Turn Undead"] },
  "Divine Cleansing": { requiredFeats: ["Turn Undead"] },
  "Divine Energy Focus": { abilityScores: { CHA: 13 }, requiredFeats: ["Turn Undead"], notes: ["Turn Undead or Turn Spirit"] },
  "Divine Resistance": { requiredFeats: ["Turn Undead", "Divine Cleansing"] },
  "Divine Vigor": { requiredFeats: ["Turn Undead"] },
  "Energy Drain (Feat)": { abilityScores: { CHA: 13 }, requiredFeats: ["Turn Undead"] },
  "Profane Boost": { skillRanks: [{ skill: "Antagonize", ranks: 6 }], requiredFeats: ["Turn Undead", "Profane Lifeleech"] },
  "Profane Lifeleech": { requiredFeats: ["Turn Undead"] },
  "Profane Outburst": { requiredFeats: ["Turn Undead"] },
  "Sacred Boost": { skillRanks: [{ skill: "Heal", ranks: 12 }], requiredFeats: ["Turn Undead", "Sacred Purification"] },
  "Sacred Healing": { skillRanks: [{ skill: "Heal", ranks: 8 }], requiredFeats: ["Turn Undead"] },
  "Sacred Purification": { skillRanks: [{ skill: "Heal", ranks: 8 }], requiredFeats: ["Turn Undead", "Sacred Healing"] },
  "Sacred Radiance": { requiredFeats: ["Turn Undead", "Divine Cleansing"] },
  "Sacred Vitality": { requiredFeats: ["Turn Undead"] },

  // --- Lay on Hands ---
  "Lay on Hands": { requiredClassAnyOf: [{ className: "Paladin" }, { className: "Divine Champion" }] },
  "Hands of a Healer": { abilityScores: { CHA: 16 }, requiredFeats: ["Lay on Hands"] },

  // --- Barbarian ---
  "Barbarian Rage": { requiredClass: { className: "Barbarian" } },
  "Blazing Berserker": { requiredFeats: ["Barbarian Rage"] },
  "Destructive Rage": { requiredFeats: ["Barbarian Rage"] },
  "Extended Rage": { requiredFeats: ["Barbarian Rage"] },
  "Extra Rage": { requiredFeats: ["Barbarian Rage"] },
  "Frozen Berserker": { requiredFeats: ["Barbarian Rage"] },
  "Fury of Stone": { requiredFeats: ["Barbarian Rage"], notes: ["Requires Darkvision"] },
  "Indomitable Will": { requiredClass: { className: "Barbarian", level: 14 } },
  "Lightning Rage": { abilityScores: { DEX: 13 }, requiredFeats: ["Barbarian Rage"] },
  Literacy: { requiredClass: { className: "Barbarian" }, notes: ["Barbarians are illiterate by default; this feat grants literacy"] },
  "Mighty Rage": { requiredClass: { className: "Barbarian", level: 20 } },
  "Mystic Rage": { requiredClass: { className: "Barbarian", level: 10 } },
  "Reckless Rage": { requiredFeats: ["Barbarian Rage", "Power Attack"] },
  "Stone Rage": { abilityScores: { CON: 13 }, requiredFeats: ["Barbarian Rage"] },
  "Tireless Rage": { requiredClass: { className: "Barbarian", level: 17 } },

  // --- Bard ---
  "Bard Song": { requiredClass: { className: "Bard" } },
  "Curse Song": { requiredClass: { className: "Bard" } },
  "Chant of Fortitude": {
    skillRanks: [
      { skill: "Perform", ranks: 9 },
      { skill: "Concentration", ranks: 9 },
    ],
    requiredFeats: ["Bard Song"],
  },
  "Dirge of Woe": { skillRanks: [{ skill: "Perform", ranks: 9 }], requiredFeats: ["Bard Song"] },
  "Epic of the Lost King": { skillRanks: [{ skill: "Perform", ranks: 6 }], requiredFeats: ["Bard Song"] },
  "Haunting Melody": { skillRanks: [{ skill: "Perform", ranks: 9 }], requiredFeats: ["Bard Song"] },
  "Inspire Spellpower": {
    skillRanks: [
      { skill: "Perform", ranks: 9 },
      { skill: "Concentration", ranks: 9 },
    ],
    requiredFeats: ["Bard Song"],
  },
  "Song of the Heart": { skillRanks: [{ skill: "Perform", ranks: 6 }], anyOfFeats: ["Bard Song", "Mora Domain"] },
  Subsonics: { skillRanks: [{ skill: "Perform", ranks: 10 }], anyOfFeats: ["Bard Song", "Mora Domain"] },
  "Weapon Proficiency (Bard)": { requiredClass: { className: "Bard", level: 2 } },

  // --- Duskblade ---
  "Battle Magic Tactics": {
    skillRanks: [{ skill: "Spellcraft", ranks: 6 }],
    notes: ["Ability to cast 3rd-level arcane spells"],
  },

  // --- Fighter ---
  "Armor Skin": { minBAB: 17, abilityScores: { CON: 15 }, requiredFeats: ["Toughness"] },
  "Combat Focus": { requiredClass: { className: "Fighter", level: 6 } },
  "Combat Absorption": {
    abilityScores: { CON: 12 },
    requiredFeats: ["Combat Focus"],
    requiredClass: { className: "Fighter", level: 8 },
    notes: ["Also requires Resist Energy (Any)"],
  },
  "Combat Awareness": {
    abilityScores: { WIS: 12 },
    requiredFeats: ["Combat Focus", "Blind-Fight"],
    requiredClass: { className: "Fighter", level: 12 },
  },
  "Combat Defense": {
    abilityScores: { DEX: 13 },
    requiredFeats: ["Combat Focus", "Dodge"],
    requiredClass: { className: "Fighter", level: 9 },
  },
  "Combat Hardiness": {
    abilityScores: { CON: 13 },
    requiredFeats: ["Combat Focus"],
    requiredClass: { className: "Fighter", level: 13 },
  },
  "Combat Speed": {
    abilityScores: { DEX: 13 },
    requiredFeats: ["Combat Focus"],
    requiredClass: { className: "Fighter", level: 16 },
  },
  "Combat Stability": {
    abilityScores: { STR: 12 },
    requiredFeats: ["Combat Focus"],
    requiredClass: { className: "Fighter", level: 6 },
  },
  "Combat Strike": {
    abilityScores: { INT: 13 },
    requiredFeats: ["Combat Focus"],
    requiredClass: { className: "Fighter", level: 13 },
  },
  "Combat Vigor": {
    abilityScores: { CON: 13 },
    requiredFeats: ["Combat Focus", "Toughness"],
    requiredClass: { className: "Fighter", level: 16 },
  },
  "Final Stand": { abilityScores: { CHA: 12 }, requiredClass: { className: "Fighter", level: 16 } },
  "Greater Weapon Focus": {
    requiredFeats: ["Weapon Focus"],
    requiredClassAnyOf: [
      { className: "Fighter", level: 8 },
      { className: "Black Powder Avenger", level: 6 },
    ],
  },
  "Greater Weapon Specialization": {
    requiredFeats: ["Greater Weapon Focus", "Weapon Focus", "Weapon Specialization"],
    requiredClassAnyOf: [
      { className: "Fighter", level: 12 },
      { className: "Black Powder Avenger", level: 8 },
    ],
  },
  "Inspire Competence": { abilityScores: { CHA: 12 }, requiredClass: { className: "Fighter", level: 12 } },
  "Overwhelming Critical": {
    minBAB: 17,
    abilityScores: { STR: 18 },
    requiredFeats: ["Cleave", "Great Cleave", "Improved Critical", "Power Attack"],
  },
  "Rallying Cry": { abilityScores: { CHA: 12 }, requiredClass: { className: "Fighter", level: 10 } },
  "Superior Initiative": {
    minBAB: 12,
    abilityScores: { DEX: 15 },
    requiredFeats: ["Improved Initiative"],
    requiredClass: { className: "Fighter", level: 10 },
  },

  // --- Hexblade ---
  "Hexblade's Curse": { requiredClass: { className: "Hexblade", level: 1 } },
  "Arcane Resistance": { requiredClass: { className: "Hexblade", level: 2 } },
  Mettle: { requiredClass: { className: "Hexblade", level: 3 } },
  "Aura of Unluck": { requiredClass: { className: "Hexblade", level: 12 } },
  "Curse of Dissolution": { requiredFeats: ["Hexblade's Curse"] },
  "Curse of Distraction": { requiredFeats: ["Hexblade's Curse"] },
  "Curse of Failure": { requiredFeats: ["Hexblade's Curse"] },
  "Curse of Ignorance": { requiredFeats: ["Hexblade's Curse"] },
  "Curse of Paranoia": { requiredFeats: ["Hexblade's Curse"] },
  "Curse of Sloth": { requiredFeats: ["Hexblade's Curse"] },
  "Curse of the Softened Blade": { requiredFeats: ["Hexblade's Curse"] },
  "Curse of the Stricken": { requiredFeats: ["Hexblade's Curse"] },
  "Curse Focus": { requiredFeats: ["Hexblade's Curse"] },
  "Empower Curse": { requiredFeats: ["Hexblade's Curse"] },
  "Extend Curse": { requiredFeats: ["Hexblade's Curse"] },
  "Extra Curse": { requiredFeats: ["Hexblade's Curse"] },

  // --- Druid ---
  "Cheetah's Speed": { requiredFeats: ["Wild Shape"] },
  "Cougar's Vision": { skillRanks: [{ skill: "Spot", ranks: 2 }], requiredFeats: ["Wild Shape"] },
  "Elemental Essence": {
    requiredFeats: ["Wild Shape"],
    requiredClassAnyOf: [
      { className: "Druid", level: 6 },
      { className: "Shifter", level: 1 },
    ],
  },
  "Elephant's Hide": {
    requiredFeats: ["Wild Shape"],
    requiredClassAnyOf: [
      { className: "Druid", level: 8 },
      { className: "Shifter", level: 2 },
    ],
  },
  "Extra Wild Shape": { requiredFeats: ["Wild Shape"] },
  "Frozen Wild Shape": { requiredFeats: ["Wild Shape"], notes: ["Requires a Fortitude save bonus of +6 or higher"] },
  "Hawk's Vision": { skillRanks: [{ skill: "Spot", ranks: 4 }], requiredFeats: ["Wild Shape"] },
  "Oaken Resilience": {
    requiredFeats: ["Wild Shape"],
    requiredClassAnyOf: [
      { className: "Druid", level: 12 },
      { className: "Shifter", level: 7 },
    ],
  },
  "Primeval Wild Shape": { requiredFeats: ["Wild Shape", "Cold Endurance"] },
  "Savage Mobility": { abilityScores: { DEX: 13 }, requiredFeats: ["Wild Shape"] },
  "Scorching Wild Shape": { requiredFeats: ["Wild Shape"], notes: ["Requires a Fortitude save bonus of +6 or higher"] },
  "Swim like a Fish": { requiredFeats: ["Wild Shape"] },
  "Verdant Wild Shape": { requiredFeats: ["Wild Shape"], notes: ["Requires a Fortitude save bonus of +6 or higher"] },
  "Wild Shape": {
    requiredClassAnyOf: [
      { className: "Druid", level: 5 },
      { className: "Shifter", level: 1 },
    ],
  },
  "Wild Shape (non-aggressive)": { requiredClass: { className: "Druid", level: 5 } },
  "Wolverine's Rage": { requiredFeats: ["Wild Shape"] },

  // --- Monk ---
  "Axiomatic Strike": { requiredFeats: ["Stunning Fist"], requiredClass: { className: "Monk", level: 10 } },
  "Fiery Fist": {
    minBAB: 8,
    abilityScores: { DEX: 13, WIS: 13 },
    requiredFeats: ["Improved Unarmed Strike", "Stunning Fist"],
  },
  "Fiery Ki Defense": {
    minBAB: 8,
    abilityScores: { DEX: 13, WIS: 13 },
    requiredFeats: ["Fiery Fist", "Improved Unarmed Strike", "Stunning Fist"],
  },
  "Ki Blast": {
    minBAB: 8,
    abilityScores: { DEX: 13, WIS: 13 },
    requiredFeats: ["Fiery Fist", "Improved Unarmed Strike", "Stunning Fist"],
  },
  "Unorthodox Flurry": { requiredFeats: ["Flurry of Blows"] },

  // --- Paladin ---
  "Aura of Courage": { requiredClass: { className: "Paladin", level: 2 } },
  "Detect Evil": { requiredClass: { className: "Paladin", level: 2 } },
  "Expanded Aura of Courage": { skillRanks: [{ skill: "Influence", ranks: 8 }], requiredFeats: ["Aura of Courage"] },
  "Shield Maiden's Grace": {
    requiredFeats: ["Turn Undead"],
    notes: ["Requires the Divine Grace class ability"],
  },

  // --- Rogue ---
  "Face in the Crowd": { requiredClass: { className: "Rogue", level: 10 } },
  "Light Sleeper": { requiredClass: { className: "Rogue", level: 10 } },

  // --- Shaman ---
  "Ancestral Spirit Calling": {
    abilityScores: { CHA: 13 },
    requiredFeats: ["Turn Undead"],
    requiredClass: { className: "Shaman", level: 4 },
  },
  "Malicious Spirit Calling": {
    abilityScores: { CHA: 13 },
    requiredFeats: ["Turn Undead"],
    requiredClass: { className: "Shaman", level: 4 },
  },
  "Wild Spirit Calling": {
    abilityScores: { CHA: 13 },
    requiredFeats: ["Turn Undead"],
    requiredClass: { className: "Shaman", level: 8 },
  },
  "Savage Spirit Calling": {
    abilityScores: { CHA: 13 },
    requiredFeats: ["Turn Undead"],
    requiredClass: { className: "Shaman", level: 8 },
  },
  "Nature Spirit Calling": {
    abilityScores: { CHA: 13 },
    requiredFeats: ["Turn Undead"],
    requiredClass: { className: "Shaman", level: 12 },
  },
  "Calamitous Spirit Calling": {
    abilityScores: { CHA: 13 },
    requiredFeats: ["Turn Undead"],
    requiredClass: { className: "Shaman", level: 12 },
  },

  // --- Blackguard ---
  "Aura of Despair": { requiredClass: { className: "Blackguard", level: 3 } },
  "Detect Good": { requiredClass: { className: "Blackguard", level: 1 } },

  // --- Shadowdancer ---
  "Shadow Jump": { requiredClass: { className: "Shadowdancer", level: 4 } },

  // --- Warlock ---
  "Eldritch Blast": { requiredClass: { className: "Warlock" } },
  "Eldritch Claws": { requiredClass: { className: "Warlock", level: 3 } },

  // --- Warmage ---
  "Armored Mage": { requiredClass: { className: "Warmage", level: 1 } },
  "Warmage Edge": { requiredClass: { className: "Warmage", level: 1 } },
  "Extra Edge": { requiredClass: { className: "Warmage", level: 4 } },

  // --- Beguiler ---
  "Armored Mage (Beguiler)": { requiredClass: { className: "Beguiler", level: 1 } },
  "Cloaked Casting": { requiredClass: { className: "Beguiler", level: 2 } },

  // --- Monster Hunter ---
  "Studied Foe": { requiredClass: { className: "Monster Hunter", level: 2 } },

  // --- Hallowed Witch ---
  "Weave Protection": { requiredClass: { className: "Hallowed Witch", level: 2 } },
  "Minor Witchcraft Ability": { requiredClass: { className: "Hallowed Witch", level: 1 } },
  "Major Witchcraft Ability": { requiredClass: { className: "Hallowed Witch", level: 6 } },

  // --- Shifter (wiki: "Master of Many Forms") ---
  "Shifter's Speech": { requiredClass: { className: "Shifter", level: 1 } },
  "Improved Wild Shape I": { requiredClass: { className: "Shifter", level: 1 } },
  "Improved Wild Shape II": { requiredClass: { className: "Shifter", level: 3 } },
  "Improved Wild Shape III": { requiredClass: { className: "Shifter", level: 5 } },
  "Improved Wild Shape IV": { requiredClass: { className: "Shifter", level: 10 } },
  "Humanoid Shape": { requiredClass: { className: "Shifter", level: 7 } },
  "Elemental Shape": { requiredClass: { className: "Shifter", level: 9 }, notes: ["Also requires Druid level 16 (automatic)"] },
  "Evershifting Form": { requiredClass: { className: "Shifter", level: 10 } },

  // --- Dirgist ---
  "Lament for the Fallen": { requiredClass: { className: "Dirgist", level: 1 } },
  "Whispers of the Dead": { requiredClass: { className: "Dirgist", level: 1 } },

  // --- Archivist ---
  "Archivist of Nature": { requiredClass: { className: "Archivist", level: 1 } },
  "Draconic Archivist": { requiredClass: { className: "Archivist", level: 1 } },
  "Archivist of Dread": { requiredClass: { className: "Archivist", level: 1 } },

  // --- Base game feats (nwn.fandom.com), General/Metamagic/First-Level only ---
  // "Curse Song", "Improved Expertise", and "Rapid Reload" also exist as PoTM-modified feats
  // above (with different, PoTM-specific prerequisites) — those entries take precedence and are
  // intentionally not duplicated here.
  "Ambidexterity": { abilityScores: { DEX: 15 } },
  "Arcane Defense": { anyOfFeats: Object.keys(spellFocusPrereqs) },
  "Armor Proficiency (Heavy)": { requiredFeats: ["Armor Proficiency (Light)", "Armor Proficiency (Medium)"] },
  "Armor Proficiency (Medium)": { requiredFeats: ["Armor Proficiency (Light)"] },
  "Artist": { maxCharacterLevel: 1, notes: ["Requires the Perform skill"] },
  "Blooded": { maxCharacterLevel: 1 },
  "Brew Potion": { notes: ["Spellcaster level 3+"] },
  "Bullheaded": { maxCharacterLevel: 1 },
  "Called Shot": { minBAB: 1 },
  "Circle Kick": { minBAB: 3, abilityScores: { DEX: 15 }, requiredFeats: ["Improved Unarmed Strike"] },
  "Cleave": { abilityScores: { STR: 13 }, requiredFeats: ["Power Attack"] },
  "Combat Casting": { notes: ["Ability to cast 1st-level spells"] },
  "Courteous Magocracy": { maxCharacterLevel: 1 },
  "Craft Wand": { notes: ["Spellcaster level 5+"] },
  "Deflect Arrows": { abilityScores: { DEX: 13 }, requiredFeats: ["Improved Unarmed Strike"] },
  "Dirty Fighting": { minBAB: 2 },
  "Disarm": { abilityScores: { INT: 13 } },
  "Divine Might": { abilityScores: { CHA: 13, STR: 13 }, requiredFeats: ["Turn Undead", "Power Attack"] },
  "Divine Shield": { abilityScores: { CHA: 13, STR: 13 }, requiredFeats: ["Turn Undead", "Power Attack"] },
  "Dodge": { abilityScores: { DEX: 13 } },
  "Empower Spell": { notes: ["Ability to cast 2nd-level spells"] },
  "Expertise": { abilityScores: { INT: 13 } },
  "Extend Spell": { notes: ["Ability to cast 1st-level spells"] },
  "Extra Music": { requiredFeats: ["Bard Song"] },
  "Extra Smiting": { notes: ["Smite Evil or Smite Good class ability"] },
  "Extra Stunning Attacks": { minBAB: 2, requiredFeats: ["Stunning Fist"] },
  "Extra Turning": { requiredFeats: ["Turn Undead"], requiredClassAnyOf: [{ className: "Cleric" }, { className: "Paladin" }] },
  "Great Cleave": { minBAB: 4, abilityScores: { STR: 13 }, requiredFeats: ["Power Attack", "Cleave"] },
  "Greater Spell Penetration": { requiredFeats: ["Spell Penetration"] },
  "Improved Critical": { minBAB: 8, notes: ["Proficiency with the chosen weapon"] },
  "Improved Disarm": { abilityScores: { INT: 13 }, requiredFeats: ["Disarm"] },
  "Improved Knockdown": { minBAB: 7, abilityScores: { INT: 13 }, requiredFeats: ["Knockdown"] },
  "Improved Parry": { abilityScores: { INT: 13 } },
  "Improved Power Attack": { abilityScores: { STR: 13 }, requiredFeats: ["Power Attack"] },
  "Improved Two-Weapon Fighting": { minBAB: 9, requiredFeats: ["Two-Weapon Fighting", "Ambidexterity"] },
  "Lingering Song": { requiredFeats: ["Bard Song"] },
  "Luck of Heroes": { maxCharacterLevel: 1 },
  "Maximize Spell": { notes: ["Ability to cast 3rd-level spells"] },
  "Mobility": { abilityScores: { DEX: 13 }, requiredFeats: ["Dodge"] },
  "Mounted Archery": { requiredFeats: ["Mounted Combat"], notes: ["Ride 1 rank — Ride is disabled on PoTM"] },
  "Mounted Combat": { notes: ["Ride 1 rank — Ride is disabled on PoTM"] },
  "Power Attack": { abilityScores: { STR: 13 } },
  "Quicken Spell": { notes: ["Ability to cast 4th-level spells"] },
  "Rapid Shot": { abilityScores: { DEX: 13 }, requiredFeats: ["Point Blank Shot"] },
  "Resist Energy": { notes: ["Fortitude save bonus +8"] },
  "Sap": { minBAB: 1, requiredFeats: ["Called Shot"] },
  "Scribe Scroll": { notes: ["Spellcaster level 1+"] },
  "Silent Spell": { notes: ["Ability to cast 1st-level spells"] },
  "Silver Palm": { maxCharacterLevel: 1 },
  "Snake Blood": { maxCharacterLevel: 1 },
  "Spell Penetration": { notes: ["Ability to cast 1st-level spells"] },
  "Spring Attack": { minBAB: 4, abilityScores: { DEX: 13 }, requiredFeats: ["Dodge", "Mobility"] },
  "Still Spell": { notes: ["Ability to cast 1st-level spells"] },
  "Strong Soul": { maxCharacterLevel: 1 },
  "Stunning Fist": { minBAB: 8, abilityScores: { DEX: 13, WIS: 13 }, requiredFeats: ["Improved Unarmed Strike"] },
  "Weapon Finesse": { minBAB: 1 },
  "Weapon Focus": { minBAB: 1, notes: ["Proficiency with the chosen weapon"] },
  "Weapon Proficiency (Exotic)": { minBAB: 1 },
  "Weapon Specialization": { minBAB: 4, requiredClass: { className: "Fighter" }, requiredFeats: ["Weapon Focus"] },
  "Whirlwind Attack": { minBAB: 4, abilityScores: { DEX: 13, INT: 13 }, requiredFeats: ["Expertise", "Dodge", "Mobility", "Spring Attack"] },
  "Zen Archery": { minBAB: 3, abilityScores: { WIS: 13 } },
};
