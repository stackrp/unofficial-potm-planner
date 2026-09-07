/**
 * Canonical way to name a single level in the plan: character level first, then the class and
 * its running class level, e.g. `Lvl 3 (Fighter 1)`. Used by the feat selector and the Class
 * Abilities list so both read the same way.
 */
export function levelLabel(
  characterLevel: number,
  className: string,
  classLevel?: number
): string {
  if (!className) return `Lvl ${characterLevel} (unset)`;
  return `Lvl ${characterLevel} (${className}${classLevel ? ` ${classLevel}` : ""})`;
}
