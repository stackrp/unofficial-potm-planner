import raw from "./raceSettings.json";

// Sourced from the "Racial and Template options per setting" table maintained by the
// server staff: https://www.nwnravenloft.com/forum/index.php?topic=57336.msg767703
// Ravenloft is the PW's home setting so it's pinned first; "Multiple Settings" covers
// subraces the source table lists under more than one campaign setting (e.g. Duergar,
// Tiefling) and sorts last so single-setting groups aren't pushed down by it.
export const SETTING_ORDER = [
  "Ravenloft",
  "Birthright",
  "Dark Sun",
  "Dragonlance",
  "Eberron",
  "Forgotten Realms",
  "Greyhawk",
  "Mystara",
  "Planescape",
  "Spelljammer",
  "Multiple Settings",
] as const;

export type Setting = (typeof SETTING_ORDER)[number];

const SETTINGS = raw as Record<string, Setting>;

export function settingForRace(raceName: string): Setting | undefined {
  return SETTINGS[raceName];
}
