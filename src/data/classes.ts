import raw from "./classes.json";

export type BabRate = "full" | "threeQuarter" | "half";

export interface SaveProgression {
  fort: boolean;
  ref: boolean;
  will: boolean;
}

export interface ClassDef {
  name: string;
  maxLevel: number;
  hitDie: number;
  babRate: BabRate;
  skillPoints: number;
  saves: SaveProgression;
  /** bonusFeatsByLevel[0] = feats gained at relative level 1 of this class, etc. */
  bonusFeatsByLevel: number[];
}

export const CLASSES: Record<string, ClassDef> = raw as Record<string, ClassDef>;

export const CLASS_NAMES: string[] = Object.keys(CLASSES).sort();
