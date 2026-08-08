import { useMemo, useState } from "react";
import { FEATS, FEATS_BY_NAME } from "../data/feats";
import type { FeatEntry } from "../types";

interface Props {
  feats: FeatEntry[];
  onChange: (feats: FeatEntry[]) => void;
  featsAvailable: number;
  maxLevel: number;
}

export function FeatTracker({ feats, onChange, featsAvailable, maxLevel }: Props) {
  const [draftLevel, setDraftLevel] = useState(1);
  const [draftName, setDraftName] = useState("");
  const [finderFilter, setFinderFilter] = useState("");

  const matchingFeats = useMemo(() => {
    const q = finderFilter.trim().toLowerCase();
    const matches = q
      ? FEATS.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
      : FEATS;
    const byCategory = new Map<string, typeof FEATS>();
    for (const f of matches) {
      const list = byCategory.get(f.category) ?? [];
      list.push(f);
      byCategory.set(f.category, list);
    }
    return [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [finderFilter]);

  function addFeat() {
    if (!draftName.trim()) return;
    onChange([...feats, { level: draftLevel, name: draftName.trim() }]);
    setDraftName("");
  }

  function removeFeat(index: number) {
    onChange(feats.filter((_, i) => i !== index));
  }

  const used = feats.length;
  const overLimit = used > featsAvailable;

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-100">Feats</h2>
        <span className={`text-sm font-mono ${overLimit ? "text-red-400" : "text-neutral-400"}`}>
          {used} / {featsAvailable} used
        </span>
      </div>

      <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-2 mb-2">
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Feat Finder — PoTM-added/modified feats only
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by name or category (e.g. Fighter, Racial)..."
            value={finderFilter}
            onChange={(e) => setFinderFilter(e.target.value)}
            className="w-64 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
          />
          <select
            value=""
            onChange={(e) => e.target.value && setDraftName(e.target.value)}
            className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
          >
            <option value="">
              {matchingFeats.reduce((n, [, fs]) => n + fs.length, 0)} matching feat(s) — pick one to fill the
              name below
            </option>
            {matchingFeats.map(([category, fs]) => (
              <optgroup key={category} label={category}>
                {fs.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Only lists feats PoTM has added or modified. Standard NWN feats (Toughness, Weapon Focus,
          etc.) aren't included here — some are restricted on this server and we don't have a
          reliable source for which, so type those directly below instead.
        </p>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="number"
          min={1}
          max={maxLevel || 1}
          value={draftLevel}
          onChange={(e) => setDraftLevel(Number(e.target.value))}
          className="w-16 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
        />
        <input
          type="text"
          placeholder="Feat name (e.g. Toughness, Great Fortitude)"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFeat()}
          className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
        />
        <button
          type="button"
          onClick={addFeat}
          className="px-3 py-1 rounded bg-violet-700 hover:bg-violet-600 text-white text-sm"
        >
          Add
        </button>
      </div>

      <ul className="space-y-1">
        {feats
          .slice()
          .sort((a, b) => a.level - b.level)
          .map((f, i) => (
            <li
              key={`${f.level}-${f.name}-${i}`}
              className="flex items-center justify-between text-sm bg-neutral-950/40 rounded px-2 py-1"
            >
              <span className="text-neutral-300">
                <span className="text-neutral-500 font-mono mr-2">Lv{f.level}</span>
                {f.name}
                {FEATS_BY_NAME.has(f.name) && (
                  <span className="ml-2 text-xs text-neutral-600">({FEATS_BY_NAME.get(f.name)!.category})</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => removeFeat(feats.indexOf(f))}
                className="text-neutral-500 hover:text-red-400 text-xs"
              >
                remove
              </button>
            </li>
          ))}
        {feats.length === 0 && <li className="text-sm text-neutral-500">No feats added yet.</li>}
      </ul>
    </section>
  );
}
