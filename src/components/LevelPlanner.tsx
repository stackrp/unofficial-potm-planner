import { CLASS_NAMES } from "../data/classes";
import { ABILITY_KEYS, type AbilityKey, type LevelEntry } from "../types";
import type { LevelSnapshot } from "../lib/calculator";

interface Props {
  levels: LevelEntry[];
  onChange: (levels: LevelEntry[]) => void;
  snapshots: LevelSnapshot[];
}

const MAX_CHAR_LEVEL = 40;

export function LevelPlanner({ levels, onChange, snapshots }: Props) {
  function addLevel() {
    if (levels.length >= MAX_CHAR_LEVEL) return;
    const prevClass = levels[levels.length - 1]?.className ?? CLASS_NAMES[0];
    onChange([...levels, { level: levels.length + 1, className: prevClass }]);
  }

  function removeLevel() {
    onChange(levels.slice(0, -1));
  }

  function setClass(index: number, className: string) {
    const next = [...levels];
    next[index] = { ...next[index], className };
    onChange(next);
  }

  function setAbilityIncrease(index: number, ability: AbilityKey | "") {
    const next = [...levels];
    next[index] = { ...next[index], abilityIncrease: ability === "" ? undefined : ability };
    onChange(next);
  }

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-100">Levels</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={removeLevel}
            disabled={levels.length === 0}
            className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
          >
            Remove level
          </button>
          <button
            type="button"
            onClick={addLevel}
            disabled={levels.length >= MAX_CHAR_LEVEL}
            className="px-3 py-1 rounded bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-30 text-sm"
          >
            Add level
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="text-neutral-400 border-b border-neutral-700">
              <th className="py-1 pr-2 font-medium">Lvl</th>
              <th className="py-1 pr-2 font-medium">Class</th>
              <th className="py-1 pr-2 font-medium">Ability Up</th>
              <th className="py-1 pr-2 font-medium text-right">HP</th>
              <th className="py-1 pr-2 font-medium text-right">BAB</th>
              <th className="py-1 pr-2 font-medium text-right">Skill</th>
              <th className="py-1 pr-2 font-medium text-right">Feats</th>
              <th className="py-1 pr-2 font-medium text-right">Fort*</th>
              <th className="py-1 pr-2 font-medium text-right">Ref*</th>
              <th className="py-1 pr-2 font-medium text-right">Will*</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((entry, i) => {
              const snap = snapshots[i];
              const canIncreaseAbility = entry.level % 4 === 0;
              return (
                <tr key={entry.level} className="border-b border-neutral-800">
                  <td className="py-1 pr-2 text-neutral-300 font-mono">{entry.level}</td>
                  <td className="py-1 pr-2">
                    <select
                      value={entry.className}
                      onChange={(e) => setClass(i, e.target.value)}
                      className="bg-neutral-950 border border-neutral-700 rounded px-1 py-0.5 text-neutral-100"
                    >
                      {CLASS_NAMES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    {canIncreaseAbility ? (
                      <select
                        value={entry.abilityIncrease ?? ""}
                        onChange={(e) =>
                          setAbilityIncrease(i, e.target.value as AbilityKey | "")
                        }
                        className="bg-neutral-950 border border-neutral-700 rounded px-1 py-0.5 text-neutral-100"
                      >
                        <option value="">—</option>
                        {ABILITY_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-300">{snap?.hp ?? "-"}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-300">{snap ? `+${snap.bab}` : "-"}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-300">{snap?.skillPointsGained ?? "-"}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-300">{snap?.featsGained ?? "-"}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-300">{snap ? `+${snap.fort}` : "-"}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-300">{snap ? `+${snap.ref}` : "-"}</td>
                  <td className="py-1 pr-2 text-right font-mono text-neutral-300">{snap ? `+${snap.will}` : "-"}</td>
                </tr>
              );
            })}
            {levels.length === 0 && (
              <tr>
                <td colSpan={10} className="py-4 text-center text-neutral-500">
                  No levels yet — click "Add level" to start planning.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        * Class save progression only — ability modifiers, save-boosting feats, and class
        special abilities (Divine Grace, Sacred Defense, etc.) are added once in the totals below.
      </p>
    </section>
  );
}
