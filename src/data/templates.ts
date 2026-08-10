import raw from "./templates.json";
import type { AbilityKey } from "../types";

export interface TemplateDef {
  name: string;
  abilityAdjustments: Partial<Record<AbilityKey, number>>;
  effectiveCharacterLevel: number | null;
  /** Approximate — several templates document this as "or more" depending on how visible the
   * character's chosen minor traits are; treat as a floor, not an exact value. Null when the
   * source thread doesn't document a value at all. */
  outcastRatingIncrease: number | null;
  requiresApplication: boolean;
  restriction: string;
  traits: string[];
  notes: string[];
  /** True only for templates that change creature type away from Humanoid (currently just
   * Feytouched, per its notes) — a Human's bonus skill point per level is a hardcoded Humanoid
   * perk, so it's lost once this applies. The bonus feat at level 1 is unaffected. */
  removesHumanSkillPointBonus: boolean;
}

// Templates are an orthogonal overlay on top of race/subrace (see raceCategories.ts) — a
// character can apply one template on top of their race/subrace, contributing its own free
// ability adjustments and ECL. Sourced from the "Subrace & Template Roleplaying Resources and
// Lore" forum thread's Game Stats spoilers.
export const TEMPLATES: TemplateDef[] = raw as TemplateDef[];

const TEMPLATES_BY_NAME = new Map(TEMPLATES.map((t) => [t.name, t]));

export function getTemplate(name: string): TemplateDef | undefined {
  return TEMPLATES_BY_NAME.get(name);
}
