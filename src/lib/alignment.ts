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
