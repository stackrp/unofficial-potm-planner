import { ABILITY_KEYS, type AbilityKey, type AbilityScores } from "../types";
import { POINT_BUY_BUDGET, pointBuyCostForRace } from "../lib/calculator";
import { getRace } from "../data/races";
import { autoModForRace } from "../data/raceCategories";

const LABELS: Record<AbilityKey, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

interface Props {
  scores: AbilityScores;
  onChange: (scores: AbilityScores) => void;
  finalScores: AbilityScores;
  finalMods: Record<AbilityKey, number>;
  race: string;
}

export function AbilityScorePanel({ scores, onChange, finalScores, finalMods, race }: Props) {
  const spent = pointBuyCostForRace(scores, race);
  const remaining = POINT_BUY_BUDGET - spent;
  const raceDef = race ? getRace(race) : undefined;
  const autoMod = autoModForRace(race);

  // The 8-18 point-buy range shifts by the base race's auto-mod, since `scores` is the
  // post-chargen value (see the note below) — an Elf's Con (-2) can only ever reach 6-16 here,
  // matching what raw pre-racial 8-18 would actually produce.
  function rangeFor(key: AbilityKey): [number, number] {
    const shift = autoMod[key] ?? 0;
    return [8 + shift, 18 + shift];
  }

  function bump(key: AbilityKey, delta: number) {
    const next = scores[key] + delta;
    const [min, max] = rangeFor(key);
    if (next < min || next > max) return;
    onChange({ ...scores, [key]: next });
  }

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-100">Ability Scores</h2>
        <span
          className={`text-sm font-mono ${
            remaining < 0 ? "text-red-400" : remaining === 0 ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          {remaining} / {POINT_BUY_BUDGET} points remaining
        </span>
      </div>
      <p className="text-xs text-neutral-500 mb-3">
        Enter the scores your character sheet shows right after character creation — this already
        includes your base race's automatic bonus (e.g. an Elf's +2 Dex/-2 Con). Only your
        subrace's own extra bonus, if any, is added below. The budget above backs that base bonus
        back out first, so it still reflects what you actually spent.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ABILITY_KEYS.map((key) => {
          const raceAdj = raceDef?.abilityAdjustments[key] ?? 0;
          const [min, max] = rangeFor(key);
          return (
            <div
              key={key}
              className="flex flex-col items-center rounded-md border border-neutral-700 bg-neutral-950/40 p-2"
            >
              <span className="text-xs uppercase tracking-wide text-neutral-500" title={LABELS[key]}>
                {key}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => bump(key, -1)}
                  className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
                  disabled={scores[key] <= min}
                >
                  −
                </button>
                <span className="w-7 text-center font-mono text-neutral-100">{scores[key]}</span>
                <button
                  type="button"
                  onClick={() => bump(key, 1)}
                  className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
                  disabled={scores[key] >= max}
                >
                  +
                </button>
              </div>
              <span className="h-4 text-xs font-mono mt-1">
                {raceAdj !== 0 ? (
                  <span className="text-violet-400">
                    {raceAdj > 0 ? "+" : ""}
                    {raceAdj}
                  </span>
                ) : (
                  <span className="text-neutral-700">—</span>
                )}
              </span>
              <span className="text-2xl font-mono text-neutral-100 leading-tight mt-1">{finalScores[key]}</span>
              <span className="text-xs text-neutral-500">
                {finalMods[key] >= 0 ? "+" : ""}
                {finalMods[key]}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
