import { useState } from "react";
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
