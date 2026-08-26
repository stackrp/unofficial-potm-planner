/**
 * Feats granted for free — never consumed from a character's normal feat-slot budget
 * (classes.ts's `bonusFeatsByLevel` / the universal level-1 and every-3rd-level feats), but still
 * counted as "already known" when checking another feat's prerequisites (see lib/autoFeats.ts).
 *
 * Two GitHub issues prompted this file:
 * - Knockdown and Disarm are standard to every PoTM character from level 1 (house rule, not a
 *   vanilla NWN/SRD default) — see `UNIVERSAL_AUTO_FEATS`.
 * - Core class features that happen to be implemented as real feats (Bard Song, Barbarian Rage,
 *   Turn Undead, Wild Shape, Hexblade's Curse, ...) weren't being recognized as already-owned, so
 *   the planner incorrectly flagged their dependents (Chant of Fortitude, Extra Rage, Divine
 *   Vigor, ...) as missing a prerequisite the character actually has automatically.
 */
export interface AutoFeatGrant {
  /** Relative level within the class (1 = the class's first level) this feat is granted at. */
  level: number;
  featName: string;
}

/** Every character gets these at character level 1, regardless of class (PoTM house rule). */
export const UNIVERSAL_AUTO_FEATS: string[] = ["Knockdown", "Disarm"];

/**
 * Automatic, always-on class features implemented as real feats — sourced by cross-referencing
 * each class's fixed ability progression (`classAbilities.json`, from nwnravenloft.fandom.com)
 * against the feat name catalog (`feats.ts` / `vanillaFeats.ts`) for an exact, or
 * "(1x/day)"/"(2x/day)"-stripped, title match. Deliberately excludes anything that only shows up
 * in a class's *chosen* bonus-feat list (Weapon Focus, the Barbarian rage-feat tree, etc.) since
 * those never appear in `classAbilities.json` — that file only lists the fixed progression, not
 * player choices. Where an ability recurs at multiple levels with an increasing daily-use count
 * (e.g. "Barbarian Rage (2x/day)"), only the level it's first gained is listed here.
 */
export const AUTO_CLASS_FEATS: Record<string, AutoFeatGrant[]> = {
  Barbarian: [
    { level: 1, featName: "Barbarian Rage" },
    { level: 14, featName: "Indomitable Will" },
    { level: 17, featName: "Tireless Rage" },
    { level: 20, featName: "Mighty Rage" },
  ],
  Bard: [{ level: 1, featName: "Bard Song" }],
  Beguiler: [
    { level: 1, featName: "Armored Mage (Beguiler)" },
    { level: 2, featName: "Cloaked Casting" },
  ],
  Blackguard: [
    { level: 1, featName: "Detect Good" },
    { level: 3, featName: "Turn Undead" },
    { level: 3, featName: "Aura of Despair" },
  ],
  Cleric: [{ level: 1, featName: "Turn Undead" }],
  "Divine Champion": [{ level: 1, featName: "Lay on Hands" }],
  Druid: [
    { level: 5, featName: "Wild Shape" },
    { level: 5, featName: "Wild Shape (non-aggressive)" },
    { level: 16, featName: "Elemental Shape" },
  ],
  Duelist: [
    { level: 3, featName: "Spring Attack" },
    { level: 8, featName: "Superior Initiative" },
    { level: 9, featName: "Deflect Arrows" },
  ],
  Duskblade: [{ level: 1, featName: "Armored Mage" }],
  Dirgist: [
    { level: 1, featName: "Lament for the Fallen" },
    { level: 1, featName: "Whispers of the Dead" },
  ],
  "Hallowed Witch": [
    { level: 1, featName: "Minor Witchcraft Ability" },
    { level: 2, featName: "Weave Protection" },
    { level: 6, featName: "Major Witchcraft Ability" },
  ],
  Healer: [{ level: 1, featName: "Healing Hands" }],
  Hexblade: [
    { level: 1, featName: "Hexblade's Curse" },
    { level: 2, featName: "Arcane Resistance" },
    { level: 3, featName: "Mettle" },
    { level: 12, featName: "Aura of Unluck" },
  ],
  Monk: [
    { level: 1, featName: "Improved Unarmed Strike" },
    { level: 1, featName: "Stunning Fist" },
    { level: 1, featName: "Cleave" },
    { level: 2, featName: "Deflect Arrows" },
    { level: 2, featName: "Fiery Fist" },
    { level: 6, featName: "Improved Knockdown" },
    { level: 8, featName: "Fiery Ki Defense" },
    { level: 8, featName: "Ki Blast" },
  ],
  "Monster Hunter": [
    { level: 2, featName: "Studied Foe" },
    { level: 3, featName: "Turn Undead" },
  ],
  Paladin: [
    { level: 1, featName: "Lay on Hands" },
    { level: 2, featName: "Aura of Courage" },
    { level: 2, featName: "Detect Evil" },
    { level: 2, featName: "Courage" },
    { level: 3, featName: "Turn Undead" },
  ],
  Ranger: [
    { level: 3, featName: "Endurance" },
    { level: 6, featName: "Improved Two-Weapon Fighting" },
  ],
  Shadowdancer: [{ level: 4, featName: "Shadow Jump" }],
  Shaman: [
    { level: 1, featName: "Improved Unarmed Strike" },
    { level: 3, featName: "Turn Undead" },
  ],
  Shifter: [
    { level: 1, featName: "Shifter's Speech" },
    { level: 1, featName: "Wild Shape" },
    { level: 1, featName: "Improved Wild Shape I" },
    { level: 3, featName: "Improved Wild Shape II" },
    { level: 5, featName: "Improved Wild Shape III" },
    { level: 7, featName: "Humanoid Shape" },
    { level: 9, featName: "Elemental Shape" },
    { level: 10, featName: "Evershifting Form" },
    { level: 10, featName: "Improved Wild Shape IV" },
  ],
  Warlock: [{ level: 1, featName: "Eldritch Blast" }],
  Warmage: [
    { level: 1, featName: "Armored Mage" },
    { level: 1, featName: "Warmage Edge" },
  ],
  "Avenger Knight": [{ level: 2, featName: "Improved Expertise" }],
};
