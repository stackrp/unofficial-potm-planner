const LAW_CHAOS = ["L", "N", "C"];
const GOOD_EVIL = ["G", "N", "E"];

function axes(code: string): [string, string] {
  if (code === "N" || code === "TN") return ["N", "N"];
  return [code[0], code[1]];
}

/** D&D rule: a cleric's alignment may not be more than one step from their deity's,
 * measured separately on the law-chaos and good-evil axes. */
export function withinOneStep(a: string, b: string): boolean {
  if (!a || !b) return true;
  const [al, ag] = axes(a);
  const [bl, bg] = axes(b);
  return Math.abs(LAW_CHAOS.indexOf(al) - LAW_CHAOS.indexOf(bl)) <= 1 &&
         Math.abs(GOOD_EVIL.indexOf(ag) - GOOD_EVIL.indexOf(bg)) <= 1;
}

export const ALIGNMENT_LABELS: Record<string, string> = {
  LG: "Lawful Good",
  NG: "Neutral Good",
  CG: "Chaotic Good",
  LN: "Lawful Neutral",
  TN: "True Neutral",
  CN: "Chaotic Neutral",
  LE: "Lawful Evil",
  NE: "Neutral Evil",
  CE: "Chaotic Evil",
};

export const ALIGNMENT_DESCRIPTIONS: Record<string, string> = {
  LG: "Acts with compassion and honor, bound by a personal code and respect for order. E.g. a paladin who keeps every oath, a knight sworn to protect the weak.",
  NG: "Does what's right without being bound by rules or hindered by their absence. E.g. a healer who helps anyone in need, a folk hero who bends unjust laws to save others.",
  CG: "Follows their own conscience, valuing freedom and kindness over structure or authority. E.g. a rebel who frees the oppressed in defiance of the law, a wandering do-gooder who answers to no one.",
  LN: "Values order, tradition, and a personal code above notions of good or evil. E.g. a disciplined soldier who follows orders without question, a judge who applies the law strictly and impartially.",
  TN: "Doesn't lean toward good, evil, law, or chaos — acts on balance, pragmatism, or self-interest. E.g. a merchant who plays all sides, a druid who values nature's balance over moral extremes.",
  CN: "Follows their own whims and values personal freedom above all — unpredictable, but not malicious. E.g. an impulsive adventurer with no fixed allegiance, a trickster who does as they please.",
  LE: "Uses order, hierarchy, and law to pursue selfish or cruel ends. E.g. a tyrant who rules through rigid decree, a corrupt inquisitor who twists the law for personal gain.",
  NE: "Selfish and remorseless, doing whatever serves their own ends with no particular love of order or disorder. E.g. a mercenary who betrays contracts for profit, a schemer who manipulates others for advantage.",
  CE: "Destructive and self-serving, acting on violent whims with no respect for law, life, or others. E.g. a bloodthirsty raider who kills for pleasure, a mad cultist bent on ruin.",
};
