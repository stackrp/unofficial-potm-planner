/**
 * Sourced from nwnravenloft.fandom.com/wiki/Classes and each prestige class's own wiki
 * page (their "REQUIREMENTS" section), 2026-08-08. Requirements the planner can't check
 * mechanically (spell-slot access, roleplay conditions, crafting levels, weapon-specific
 * feats tied to a deity) are listed in `manualNotes` instead of `checks`.
 */

export type AlignmentRequirement =
  | "any-good"
  | "any-evil"
  | "any-lawful"
  | "true-neutral"
  | "non-chaotic-non-evil"
  | "any-non-good";

export const ALIGNMENT_REQUIREMENT_LABELS: Record<AlignmentRequirement, string> = {
  "any-good": "Any good",
  "any-evil": "Any evil",
  "any-lawful": "Any lawful",
  "true-neutral": "True Neutral",
  "non-chaotic-non-evil": "Non-chaotic and non-evil",
  "any-non-good": "Any non-good",
};

/** One requirement is satisfied if ANY of these feat names is known. A single-entry array is a plain required feat. */
export interface FeatRequirement {
  anyOf: string[];
}

/** One requirement is satisfied if the character has at least `min` levels in ANY of these classes. */
export interface ClassLevelRequirement {
  anyOf: { className: string; min: number }[];
}

export interface SkillRequirement {
  skill: string;
  ranks: number;
}

/** Base races (see raceCategories.ts categories) that qualify. */
export type RaceCategoryRequirement = string[];

export interface PrestigePrereq {
  /** Wiki page title, which may differ from the class's name in classes.json (e.g. "Shifter" -> Master of Many Forms). */
  displayName: string;
  requiresApplication: boolean;
  /** false = listed on the class overview page as unavailable on this server, despite existing in classes.json. */
  available: boolean;
  alignment?: AlignmentRequirement;
  raceCategories?: RaceCategoryRequirement;
  minBab?: number;
  feats?: FeatRequirement[];
  skills?: SkillRequirement[];
  classLevels?: ClassLevelRequirement[];
  /** Pale Master style: total levels across ARCANE_CASTER_CLASSES must be at least this. */
  arcaneLevelsAtLeast?: number;
  manualNotes?: string[];
  sourceUrl: string;
}

export const ARCANE_CASTER_CLASSES = [
  "Bard",
  "Beguiler",
  "Duskblade",
  "Hexblade",
  "Sorcerer",
  "Warlock",
  "Warmage",
  "Wizard",
];

const WIKI_BASE = "https://nwnravenloft.fandom.com/wiki/";

export const PRESTIGE_PREREQS: Record<string, PrestigePrereq> = {
  "Arcane Archer": {
    displayName: "Arcane Archer",
    requiresApplication: false,
    available: true,
    raceCategories: ["Elves", "Half-Elves"],
    minBab: 6,
    feats: [{ anyOf: ["Weapon Focus: Longbow", "Weapon Focus: Shortbow"] }, { anyOf: ["Point Blank Shot"] }],
    classLevels: [
      {
        anyOf: [
          { className: "Assassin", min: 1 },
          { className: "Bard", min: 1 },
          { className: "Beguiler", min: 1 },
          { className: "Hexblade", min: 1 },
          { className: "Monster Hunter", min: 1 },
          { className: "Warmage", min: 1 },
          { className: "Wizard", min: 1 },
          { className: "Sorcerer", min: 1 },
        ],
      },
    ],
    sourceUrl: `${WIKI_BASE}Arcane_Archer`,
  },
  "Avenger Knight": {
    displayName: "Avenger Knight",
    requiresApplication: false,
    available: true,
    alignment: "any-good",
    minBab: 6,
    feats: [{ anyOf: ["Courage"] }, { anyOf: ["Dead Man Walking"] }, { anyOf: ["Expertise"] }],
    skills: [{ skill: "Lore", ranks: 4 }],
    manualNotes: [
      "To cast spells, Wisdom must be at least 10 + the spell's level (e.g. WIS 14 for a 4th-level spell).",
    ],
    sourceUrl: `${WIKI_BASE}Avenger_Knight`,
  },
  "Crypt Raider": {
    displayName: "Crypt Raider",
    requiresApplication: false,
    available: true,
    minBab: 4,
    feats: [{ anyOf: ["Back to the Wall"] }, { anyOf: ["Courage"] }],
    skills: [
      { skill: "Disable Trap", ranks: 8 },
      { skill: "Lore", ranks: 4 },
      { skill: "Search", ranks: 8 },
    ],
    sourceUrl: `${WIKI_BASE}Crypt_Raider`,
  },
  Dirgist: {
    displayName: "Dirgist",
    requiresApplication: false,
    available: true,
    feats: [{ anyOf: ["Bard Song"] }, { anyOf: ["Dirge of Woe"] }, { anyOf: ["Endurance"] }],
    skills: [
      { skill: "Antagonize", ranks: 6 },
      { skill: "Lore", ranks: 4 },
      { skill: "Perform", ranks: 8 },
    ],
    manualNotes: ["Requires the ability to cast 3rd-level bard spells (typically Bard level 5+)."],
    sourceUrl: `${WIKI_BASE}Dirgist`,
  },
  "Divine Champion": {
    displayName: "Divine Champion",
    requiresApplication: false,
    available: true,
    minBab: 7,
    skills: [{ skill: "Lore", ranks: 3 }],
    manualNotes: ["Requires Weapon Focus in your deity's favored weapon (feat name depends on the weapon chosen)."],
    sourceUrl: `${WIKI_BASE}Divine_Champion`,
  },
  Duelist: {
    displayName: "Duelist",
    requiresApplication: false,
    available: true,
    minBab: 6,
    feats: [{ anyOf: ["Dodge"] }, { anyOf: ["Mobility"] }, { anyOf: ["Weapon Finesse"] }],
    skills: [
      { skill: "Perform", ranks: 3 },
      { skill: "Tumble", ranks: 5 },
    ],
    sourceUrl: `${WIKI_BASE}Duelist`,
  },
  "Dwarven Defender": {
    displayName: "Dwarven Defender",
    requiresApplication: false,
    available: true,
    alignment: "any-lawful",
    raceCategories: ["Dwarves"],
    minBab: 7,
    feats: [{ anyOf: ["Dodge"] }, { anyOf: ["Endurance"] }, { anyOf: ["Toughness"] }],
    sourceUrl: `${WIKI_BASE}Dwarven_Defender`,
  },
  Grimetrekker: {
    displayName: "Grimetrekker",
    requiresApplication: false,
    available: true,
    minBab: 6,
    feats: [{ anyOf: ["Back to the Wall"] }, { anyOf: ["Blind-Fight"] }, { anyOf: ["Great Fortitude"] }],
    skills: [
      { skill: "Search", ranks: 4 },
      { skill: "Lore", ranks: 4 },
    ],
    sourceUrl: `${WIKI_BASE}Grimetrekker`,
  },
  "Monster Hunter": {
    displayName: "Monster Hunter",
    requiresApplication: false,
    available: true,
    minBab: 2,
    feats: [{ anyOf: ["Courage"] }, { anyOf: ["Expertise"] }],
    skills: [
      { skill: "Search", ranks: 4 },
      { skill: "Lore", ranks: 3 },
    ],
    sourceUrl: `${WIKI_BASE}Monster_Hunter`,
  },
  "Tattooed Monk": {
    displayName: "Tattooed Monk",
    requiresApplication: false,
    available: true,
    alignment: "any-lawful",
    minBab: 3,
    feats: [{ anyOf: ["Endurance"] }, { anyOf: ["Improved Unarmed Strike"] }],
    skills: [{ skill: "Lore", ranks: 8 }],
    classLevels: [{ anyOf: [{ className: "Monk", min: 1 }] }],
    sourceUrl: `${WIKI_BASE}Tattooed_Monk`,
  },
  "Weapon Master": {
    displayName: "Weapon Master",
    requiresApplication: false,
    available: true,
    minBab: 5,
    feats: [{ anyOf: ["Whirlwind Attack"] }],
    skills: [{ skill: "Antagonize", ranks: 4 }],
    manualNotes: [
      "Also requires Weapon Focus in a melee weapon of your choice (feat name depends on the weapon).",
      "Acquiring the prerequisite feats requires Dexterity and Intelligence scores of at least 13.",
    ],
    sourceUrl: `${WIKI_BASE}Weapon_Master`,
  },
  Assassin: {
    displayName: "Assassin",
    requiresApplication: true,
    available: true,
    alignment: "any-evil",
    skills: [
      { skill: "Disguise", ranks: 4 },
      { skill: "Hide", ranks: 8 },
      { skill: "Move Silently", ranks: 8 },
    ],
    manualNotes: [
      "Roleplay requirement: must successfully execute a contracted assassination.",
      "To cast spells, Intelligence must be at least 10 + the spell's level.",
    ],
    sourceUrl: `${WIKI_BASE}Assassin`,
  },
  Blackguard: {
    displayName: "Blackguard",
    requiresApplication: true,
    available: true,
    alignment: "any-evil",
    minBab: 6,
    feats: [{ anyOf: ["Cleave"] }],
    skills: [
      { skill: "Hide", ranks: 5 },
      { skill: "Lore", ranks: 2 },
    ],
    manualNotes: [
      "Fallen paladins who failed a Powers check qualify more easily: any evil alignment, BAB +6, and Lore 2 ranks only.",
      "To cast spells, Wisdom must be at least 10 + the spell's level.",
    ],
    sourceUrl: `${WIKI_BASE}Blackguard`,
  },
  "Black Powder Avenger": {
    displayName: "Black Powder Avenger",
    requiresApplication: true,
    available: true,
    minBab: 5,
    feats: [{ anyOf: ["Weapon Proficiency: Exotic"] }],
    manualNotes: [
      "Requires Alchemy (Crafting) skill level 5 — not tracked by this planner.",
      "The standard 'Renaissance background' requirement is waived on this server.",
    ],
    sourceUrl: `${WIKI_BASE}Black_Powder_Avenger`,
  },
  "Hallowed Witch": {
    displayName: "Hallowed Witch",
    requiresApplication: true,
    available: true,
    alignment: "true-neutral",
    feats: [{ anyOf: ["Spell Focus: Divination", "Spell Focus: Enchantment"] }],
    skills: [
      { skill: "Lore", ranks: 8 },
      { skill: "Spellcraft", ranks: 8 },
    ],
    manualNotes: [
      "Requires the ability to cast 2nd-level arcane spells and 2nd-level divine spells.",
      "Roleplay requirement: must be indoctrinated into the mysteries of the Weave by another Hallowed Witch.",
      "Character must be native to the domains of the Demiplane of Dread.",
    ],
    sourceUrl: `${WIKI_BASE}Hallowed_Witch`,
  },
  Shifter: {
    displayName: "Master of Many Forms",
    requiresApplication: true,
    available: true,
    feats: [{ anyOf: ["Alertness"] }, { anyOf: ["Endurance"] }, { anyOf: ["Wild Shape"] }],
    sourceUrl: `${WIKI_BASE}Master_of_Many_Forms`,
  },
  "Pale Master": {
    displayName: "Pale Master",
    requiresApplication: true,
    available: true,
    alignment: "any-non-good",
    arcaneLevelsAtLeast: 3,
    feats: [{ anyOf: ["Skill Focus: Lore"] }],
    skills: [{ skill: "Lore", ranks: 8 }],
    sourceUrl: `${WIKI_BASE}Pale_Master`,
  },
  "People's Champion": {
    displayName: "People's Champion",
    requiresApplication: true,
    available: true,
    alignment: "non-chaotic-non-evil",
    minBab: 4,
    classLevels: [
      {
        anyOf: [
          { className: "Cleric", min: 1 },
          { className: "Favored Soul", min: 1 },
          { className: "Paladin", min: 1 },
        ],
      },
    ],
    skills: [
      { skill: "Influence", ranks: 5 },
      { skill: "Lore", ranks: 3 },
      { skill: "Search", ranks: 3 },
      { skill: "Spot", ranks: 3 },
    ],
    sourceUrl: `${WIKI_BASE}People%27s_Champion`,
  },
  Shadowdancer: {
    displayName: "Shadowdancer",
    requiresApplication: true,
    available: true,
    feats: [{ anyOf: ["Dodge"] }, { anyOf: ["Mobility"] }],
    skills: [
      { skill: "Hide", ranks: 10 },
      { skill: "Move Silently", ranks: 8 },
      { skill: "Perform", ranks: 5 },
    ],
    sourceUrl: `${WIKI_BASE}Shadowdancer`,
  },
  "Dragon Disciple": {
    displayName: "Dragon Disciple",
    requiresApplication: false,
    available: false,
    manualNotes: ["Not offered on this server (listed as an unavailable prestige class)."],
    sourceUrl: `${WIKI_BASE}Classes`,
  },
};
