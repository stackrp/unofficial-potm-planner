import { ABILITY_KEYS, type AbilityKey, type AbilityScores } from "../types";
import { pointBuyCost } from "../lib/calculator";
import { getRace } from "../data/races";

const POINT_BUY_BUDGET = 30;

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
  const spent = pointBuyCost(scores);
  const remaining = POINT_BUY_BUDGET - spent;
  const raceDef = race ? getRace(race) : undefined;

  function bump(key: AbilityKey, delta: number) {
    const next = scores[key] + delta;
    if (next < 8 || next > 18) return;
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ABILITY_KEYS.map((key) => {
          const raceAdj = raceDef?.abilityAdjustments[key] ?? 0;
          return (
            <div key={key} className="rounded-md border border-neutral-700 p-3 bg-neutral-950/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-wide text-neutral-400">{LABELS[key]}</span>
                <span className="text-xs text-neutral-500">{key}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bump(key, -1)}
                  className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30"
                  disabled={scores[key] <= 8}
                >
                  −
                </button>
                <span className="w-8 text-center text-xl font-mono text-neutral-100">{scores[key]}</span>
                <button
                  type="button"
                  onClick={() => bump(key, 1)}
                  className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30"
                  disabled={scores[key] >= 18}
                >
                  +
                </button>
              </div>
              {raceAdj !== 0 && (
                <div className="mt-1 text-xs text-neutral-500">
                  Race: <span className="text-violet-400 font-mono">{raceAdj > 0 ? "+" : ""}{raceAdj}</span>
                </div>
              )}
              <div className="mt-1 text-xs text-neutral-500">
                Final: <span className="text-neutral-300 font-mono">{finalScores[key]}</span>{" "}
                (mod{" "}
                <span className="text-neutral-300 font-mono">
                  {finalMods[key] >= 0 ? "+" : ""}
                  {finalMods[key]}
                </span>
                )
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
