import { ABILITY_KEYS, type AbilityKey, type AbilityScores } from "../types";
import { POINT_BUY_BUDGET, abilityPointBuyCost, racialAbilityAdjustments } from "../lib/calculator";

const LABELS: Record<AbilityKey, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

const MIN_SCORE = 8;
const MAX_SCORE = 18;

interface Props {
  scores: AbilityScores;
  onChange: (scores: AbilityScores) => void;
  finalScores: AbilityScores;
  finalMods: Record<AbilityKey, number>;
  race: string;
  template: string;
}

export function AbilityScorePanel({ scores, onChange, finalScores, finalMods, race, template }: Props) {
  const spent = abilityPointBuyCost(scores, race, template);
  const remaining = POINT_BUY_BUDGET - spent;
  // Full free racial package shown under each score: base auto + subrace extra + template.
  // Entered scores are pure point-buy; finals add these on top (plus level-up increases).
  const racialAdj = racialAbilityAdjustments(race, template);

  function bump(key: AbilityKey, delta: number) {
    const next = scores[key] + delta;
    if (next < MIN_SCORE || next > MAX_SCORE) return;
    onChange({ ...scores, [key]: next });
  }

  function resetAll() {
    const next = { ...scores };
    for (const key of ABILITY_KEYS) next[key] = MIN_SCORE;
    onChange(next);
  }

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-100">Ability Scores</h2>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-mono ${
              remaining < 0 ? "text-red-400" : remaining === 0 ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {remaining} / {POINT_BUY_BUDGET} points remaining
          </span>
          <button
            type="button"
            onClick={resetAll}
            disabled={spent === 0}
            title="Reset ability scores"
            className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
          >
            &#8635; Reset
          </button>
        </div>
      </div>
      <p className="text-xs text-neutral-500 mb-3">
        Enter pure point-buy scores (8–18). Base race auto-mods (e.g. an Elf&apos;s +2 Dex/−2 Con),
        any subrace extras, and template bonuses are listed in violet and applied in the final
        totals below. As in NWN, the budget is charged against the adjusted score: a racial bonus
        that lifts a stat past 14 or 16 makes the points bought in that range cost more, and a
        racial penalty on a stat left at 8 is free.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ABILITY_KEYS.map((key) => {
          const raceAdj = racialAdj[key] ?? 0;
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
                  disabled={scores[key] <= MIN_SCORE}
                >
                  −
                </button>
                <span className="w-7 text-center font-mono text-neutral-100">{scores[key]}</span>
                <button
                  type="button"
                  onClick={() => bump(key, 1)}
                  className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
                  disabled={scores[key] >= MAX_SCORE}
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
