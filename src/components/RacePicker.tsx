import { useMemo } from "react";
import { getRace } from "../data/races";
import {
  autoModForRace,
  BASE_RACE_CATEGORIES,
  categoryForRace,
  defaultRaceForCategory,
  subracesForCategory,
} from "../data/raceCategories";
import { ABILITY_KEYS, type AbilityKey } from "../types";

interface Props {
  race: string;
  onChange: (race: string) => void;
}

function formatAdjustments(adjustments: Partial<Record<string, number>>): string {
  const parts = ABILITY_KEYS.filter((k) => adjustments[k]).map(
    (k) => `${adjustments[k]! > 0 ? "+" : ""}${adjustments[k]} ${k}`
  );
  return parts.length > 0 ? parts.join(", ") : "None";
}

// races.json only ever stores a subrace's own extra bonus on top of its base race (see
// raceCategories.ts) — the base race's own auto-mod (e.g. an Elf's +2 Dex/-2 Con) isn't repeated
// per-entry there, so it has to be merged in here to show the total adjustment a player actually
// ends up with, matching what real character creation would show.
function totalAdjustments(
  race: string,
  raceAdjustments: Partial<Record<string, number>>
): Partial<Record<AbilityKey, number>> {
  const total: Partial<Record<AbilityKey, number>> = { ...autoModForRace(race) };
  for (const key of ABILITY_KEYS) {
    const extra = raceAdjustments[key];
    if (extra) total[key] = (total[key] ?? 0) + extra;
  }
  return total;
}

export function RacePicker({ race, onChange }: Props) {
  // Derived from `race` rather than tracked as its own state — `race` can change externally
  // (e.g. importing a build), and a separately-tracked category would go stale in that case.
  const category = categoryForRace(race) ?? "";

  const subraces = useMemo(() => subracesForCategory(category), [category]);
  const defaultRace = useMemo(() => defaultRaceForCategory(category), [category]);
  const selected = race ? getRace(race) : undefined;

  function handleCategoryChange(nextCategory: string) {
    onChange(nextCategory ? defaultRaceForCategory(nextCategory) ?? "" : "");
  }

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <h2 className="text-lg font-semibold text-neutral-100 mb-3">Race / Subrace</h2>
      <div className="flex gap-2 mb-3">
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-40 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
        >
          <option value="">— Base race —</option>
          {BASE_RACE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={race}
          onChange={(e) => onChange(e.target.value)}
          disabled={!category}
          className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm disabled:opacity-30"
        >
          {subraces.map((name) => (
            <option key={name} value={name}>
              {name === defaultRace ? `${name} (no subrace)` : name}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="rounded-md border border-neutral-700 bg-neutral-950/40 p-3 text-sm space-y-2">
          <div>
            <span className="text-neutral-500">Ability adjustments: </span>
            <span className="text-neutral-100 font-mono">
              {formatAdjustments(totalAdjustments(race, selected.abilityAdjustments))}
            </span>
          </div>
          {selected.effectiveCharacterLevel != null && (
            <div>
              <span className="text-neutral-500">Effective Character Level: </span>
              <span className="text-amber-400 font-mono">+{selected.effectiveCharacterLevel}</span>
            </div>
          )}
          {selected.baseOutcastRating != null && (
            <div>
              <span className="text-neutral-500">Base Outcast Rating: </span>
              <span className="text-neutral-100 font-mono">{selected.baseOutcastRating}</span>
            </div>
          )}
          {selected.traits.length > 0 && (
            <div>
              <span className="text-neutral-500">Traits: </span>
              <span className="text-neutral-300">{selected.traits.join(", ")}</span>
            </div>
          )}
          {selected.notes.length > 0 && (
            <div className="text-xs text-neutral-500 italic">
              {selected.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
