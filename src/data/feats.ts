/**
 * PoTM-added/modified feats from nwnravenloft.fandom.com/wiki/Feats, for the Feat Finder picker.
 * Deliberately excludes vanilla NWN feats (nwn.fandom.com/Category:Feats, ~313 entries) — PoTM
 * restricts some of those and there's no published list of which, so we only surface feats we can
 * positively confirm are PoTM-legal. Vanilla feats (Toughness, Weapon Focus, etc.) are still
 * addable via free-text entry in the Feats section, just not through this picker.
 */
export interface FeatDef {
  name: string;
  /** Broad grouping matching the wiki's top-level TOC sections. */
  group: string;
  /** Most specific category — a class name for class feats, otherwise a feat-type label. */
  category: string;
}

const group = (group: string, category: string, names: string[]): FeatDef[] =>
  names.map((name) => ({ name, group, category }));

export const FEATS: FeatDef[] = [
  ...group("Combat", "Combat", ["Back to the Wall", "Crossbow Sniper", "Dead Eye", "Improved Expertise", "Shield Parry"]),
  ...group("Combat", "One-Handed Duelling", ["Bonetti's Defense", "Thibault's Geometry", "Agrippa's Fundamental Guards"]),
  ...group("Combat", "Two-Weapon Defense", ["Two-Weapon Defense", "Improved Two-Weapon Defense", "Greater Two-Weapon Defense"]),
  ...group("Combat", "Firearm", ["Careful Handling", "Delven's Maneuver", "Gearling's Superposed Loading Technique"]),

  ...group("General", "General", [
    "Battle Caster", "Clarity of Vision", "Cold Endurance", "Courage", "Dead Man Walking", "Diehard",
    "Disciplined Mind", "Endurance", "Expert Dungeoneer", "Filth Eater", "Healing Hands", "Heat Endurance",
    "Lunatic", "Muse", "Natural Healer", "Opening Tap", "Polyglot", "Rapid Reload", "Sand in the Eyes",
    "Scorpion's Resolve", "Second Wind", "Shrouded Dance", "Spell Dodge", "Tactile Trapsmith", "Trapmaster",
    "Voracious", "Warding Gesture",
  ]),
  ...group("General", "Skill", [
    "Charlatan", "Deceitful", "Mimic", "No Identity", "Recognize Imposter", "Sharp Eyes", "Soothing Presence",
    "Urban Stealth", "Willbreaker",
  ]),
  ...group("General", "Mercantile", ["Experienced Haggler", "Mercantile Aptitude", "Seasoned Trader"]),
  ...group("General", "Outcast Rating", ["Sterling Reputation", "Unremarkable"]),
  ...group("General", "Animal", ["Savage Empathy", "Shared Fury", "Vermin Trainer"]),

  ...group("Racial", "Racial", [
    "Battle Hardened (Dwarf)", "Channeled Rage (Half-Orc)", "Death's Blood (Elf)", "Menacing Demeanor (Half-Orc)",
    "Nimble (Halfling)", "Piercing Sight (Gnome)",
  ]),

  ...group("Special", "Special", ["Empower Turning", "Improved Turning", "Martial Supremacy"]),

  ...group("Spellcasting", "Spellcasting", ["Augment Healing", "Critical Spell Strike", "Misted Magic", "Voice of Wrath"]),
  ...group("Spellcasting", "Conjuration", ["Augment Elemental", "Augment Summoning", "Beckon the Frozen", "Shadow Affinity"]),
  ...group("Spellcasting", "Necromancy", [
    "Bolster Resistance", "Corpsecrafter", "Deadly Chill", "Destruction Retribution", "Hardened Flesh",
    "Necromantic Might", "Necromantic Presence", "Nimble Bones",
  ]),

  ...group("Turn Undead", "Turn Undead", [
    "Turn Undead", "Aura of Life Energy", "Death's Favor", "Divine Cleansing", "Divine Energy Focus",
    "Divine Resistance", "Divine Vigor", "Energy Drain (Feat)", "Profane Boost", "Profane Lifeleech",
    "Profane Outburst", "Sacred Boost", "Sacred Healing", "Sacred Purification", "Sacred Radiance",
    "Sacred Vitality",
  ]),

  ...group("Lay on Hands", "Lay on Hands", ["Lay on Hands", "Hands of a Healer"]),

  ...group("Class", "Barbarian", [
    "Barbarian Rage", "Blazing Berserker", "Channeled Rage (Half-Orc)", "Destructive Rage", "Extended Rage",
    "Extra Rage", "Frozen Berserker", "Fury of Stone", "Indomitable Will", "Lightning Rage", "Literacy",
    "Mighty Rage", "Mystic Rage", "Reckless Rage", "Stone Rage", "Tireless Rage",
  ]),
  ...group("Class", "Bard", [
    "Bard Song", "Curse Song", "Chant of Fortitude", "Dirge of Woe", "Epic of the Lost King", "Haunting Melody",
    "Inspire Spellpower", "Song of the Heart", "Subsonics", "Weapon Proficiency (Bard)",
  ]),
  ...group("Class", "Duskblade", ["Battle Magic Tactics"]),
  ...group("Class", "Fighter", [
    "Armor Skin", "Combat Focus", "Combat Absorption", "Combat Awareness", "Combat Defense", "Combat Hardiness",
    "Combat Speed", "Combat Stability", "Combat Strike", "Combat Vigor", "Final Stand", "Greater Weapon Focus",
    "Greater Weapon Specialization", "Inspire Competence", "Overwhelming Critical", "Rallying Cry",
    "Superior Initiative",
  ]),
  ...group("Class", "Hexblade", [
    "Hexblade's Curse", "Arcane Resistance", "Mettle", "Aura of Unluck", "Curse of Dissolution",
    "Curse of Distraction", "Curse of Failure", "Curse of Ignorance", "Curse of Paranoia", "Curse of Sloth",
    "Curse of the Softened Blade", "Curse of the Stricken", "Curse Focus", "Empower Curse", "Extend Curse",
    "Extra Curse",
  ]),
  ...group("Class", "Druid", [
    "Cheetah's Speed", "Cougar's Vision", "Elemental Essence", "Elephant's Hide", "Extra Wild Shape",
    "Frozen Wild Shape", "Hawk's Vision", "Oaken Resilience", "Primeval Wild Shape", "Savage Mobility",
    "Scorching Wild Shape", "Swim like a Fish", "Verdant Wild Shape", "Wild Shape", "Wild Shape (non-aggressive)",
    "Wolverine's Rage",
  ]),
  ...group("Class", "Monk", ["Axiomatic Strike", "Fiery Fist", "Fiery Ki Defense", "Ki Blast", "Unorthodox Flurry"]),
  ...group("Class", "Paladin", ["Aura of Courage", "Detect Evil", "Expanded Aura of Courage", "Shield Maiden's Grace"]),
  ...group("Class", "Rogue", ["Face in the Crowd", "Light Sleeper"]),
  ...group("Class", "Shaman", [
    "Spirit Calling", "Ancestral Spirit Calling", "Malicious Spirit Calling", "Wild Spirit Calling",
    "Savage Spirit Calling", "Nature Spirit Calling", "Calamitous Spirit Calling",
  ]),
  ...group("Class", "Blackguard", ["Aura of Despair", "Detect Good"]),
  ...group("Class", "Shadowdancer", ["Shadow Jump"]),
  ...group("Class", "Warlock", ["Eldritch Blast", "Eldritch Claws", "Invocation Focus", "Greater Invocation Focus"]),
  ...group("Class", "Warmage", ["Armored Mage", "Warmage Edge", "Extra Edge"]),
  ...group("Class", "Beguiler", ["Armored Mage (Beguiler)", "Cloaked Casting"]),
  ...group("Class", "Monster Hunter", ["Studied Foe"]),
  ...group("Class", "Hallowed Witch", ["Weave Protection", "Minor Witchcraft Ability", "Major Witchcraft Ability"]),
  ...group("Class", "Shifter", [
    "Shifter's Speech", "Improved Wild Shape I", "Improved Wild Shape II", "Improved Wild Shape III",
    "Improved Wild Shape IV", "Humanoid Shape", "Elemental Shape", "Evershifting Form",
  ]),
  ...group("Class", "Dirgist", ["Lament for the Fallen", "Whispers of the Dead"]),
  ...group("Class", "Archivist", ["Archivist of Nature", "Draconic Archivist", "Archivist of Dread"]),
];

export const FEATS_BY_NAME: Map<string, FeatDef> = new Map(FEATS.map((f) => [f.name, f]));
