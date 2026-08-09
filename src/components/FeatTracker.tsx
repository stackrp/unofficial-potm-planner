import { useMemo, useState } from "react";
import { FEATS, FEATS_BY_NAME } from "../data/feats";
import { VANILLA_FEATS, VANILLA_FEATS_BY_NAME } from "../data/vanillaFeats";
import { checkFeatPrereqs } from "../lib/featPrereqs";
import type { LevelSnapshot } from "../lib/calculator";
import type { Build, FeatEntry } from "../types";

interface Props {
  build: Build;
  feats: FeatEntry[];
  onChange: (feats: FeatEntry[]) => void;
  featsAvailable: number;
  perLevel: LevelSnapshot[];
}

interface CombinedFeatOption {
  name: string;
  /** "PoTM" or "Base Game" — kept separate from `category` since it's the first grouping level. */
  source: string;
  category: string;
}

const COMBINED_FEAT_OPTIONS: CombinedFeatOption[] = [
  ...FEATS.map((f) => ({ name: f.name, source: "PoTM", category: f.category })),
  ...VANILLA_FEATS.map((f) => ({ name: f.name, source: "Base Game", category: f.category })),
];

function groupFeatOptions(query: string): [string, CombinedFeatOption[]][] {
  const q = query.trim().toLowerCase();
  const matches = q
    ? COMBINED_FEAT_OPTIONS.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.source.toLowerCase().includes(q)
      )
    : COMBINED_FEAT_OPTIONS;
  const byGroup = new Map<string, CombinedFeatOption[]>();
  for (const f of matches) {
    const key = `${f.source} — ${f.category}`;
    const list = byGroup.get(key) ?? [];
    list.push(f);
    byGroup.set(key, list);
  }
  return [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function featCategoryTag(name: string): string | null {
  if (FEATS_BY_NAME.has(name)) return FEATS_BY_NAME.get(name)!.category;
  if (VANILLA_FEATS_BY_NAME.has(name)) return VANILLA_FEATS_BY_NAME.get(name)!.category;
  return null;
}

/**
 * Compact search box for a single feat slot: type to filter a combined PoTM + base-game list,
 * click a result (or press Enter) to fill the slot. Enter also accepts free text that doesn't
 * match anything, so a DM-granted or homebrew feat can still be typed in directly.
 */
function InlineFeatFinder({ onSelect }: { onSelect: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const grouped = useMemo(() => groupFeatOptions(query), [query]);
  const totalCount = grouped.reduce((n, [, fs]) => n + fs.length, 0);

  function commit(name: string) {
    if (!name.trim()) return;
    onSelect(name.trim());
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative flex-1">
      <input
        type="text"
        placeholder="Search feats, or type a custom name and press Enter..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => e.key === "Enter" && commit(query)}
        className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
      />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded border border-neutral-700 bg-neutral-900 shadow-lg">
          {totalCount === 0 && (
            <div className="px-2 py-1.5 text-sm text-neutral-500">
              {query.trim()
                ? `No matching feats — press Enter to add "${query.trim()}" as a custom feat.`
                : "Type to search, or enter a custom feat name."}
            </div>
          )}
          {grouped.map(([key, fs]) => (
            <div key={key}>
              <div className="sticky top-0 px-2 py-1 text-xs uppercase tracking-wide text-neutral-500 bg-neutral-900 border-b border-neutral-800">
                {key}
              </div>
              {fs.map((f) => (
                <button
                  type="button"
                  key={f.name}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    commit(f.name);
                  }}
                  className="block w-full text-left px-2 py-1 text-sm text-neutral-200 hover:bg-violet-700/40"
                >
                  {f.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatSlotRow({
  slotLabel,
  build,
  entry,
  onRemove,
  extra,
}: {
  slotLabel: string;
  build: Build;
  entry: FeatEntry;
  onRemove: () => void;
  extra?: boolean;
}) {
  const unmet = checkFeatPrereqs(build, entry.name, entry.level);
  const category = featCategoryTag(entry.name);
  return (
    <div className={`rounded px-2 py-1 ${extra ? "bg-amber-950/10" : "bg-neutral-950/40"}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-300">
          <span className="text-neutral-600 font-mono mr-2 text-xs">{slotLabel}</span>
          {entry.name}
          <span className="ml-2 text-xs text-neutral-600">({category ?? "custom"})</span>
        </span>
        <button type="button" onClick={onRemove} className="text-neutral-500 hover:text-red-400 text-xs">
          remove
        </button>
      </div>
      {unmet.length > 0 && (
        <p className="text-xs text-amber-400 mt-0.5">Prerequisites not yet met: {unmet.join("; ")}</p>
      )}
    </div>
  );
}

export function FeatTracker({ build, feats, onChange, featsAvailable, perLevel }: Props) {
  const availableLevels = build.levels.map((l) => l.level);

  function slotsAtLevel(lvl: number): number {
    const idx = build.levels.findIndex((l) => l.level === lvl);
    return idx >= 0 ? (perLevel[idx]?.featsGained ?? 0) : 0;
  }

  const firstIncompleteLevel = availableLevels.find(
    (lvl) => feats.filter((f) => f.level === lvl).length < slotsAtLevel(lvl)
  );

  const [requestedLevel, setRequestedLevel] = useState<number | null>(null);
  const level =
    requestedLevel != null && availableLevels.includes(requestedLevel)
      ? requestedLevel
      : (firstIncompleteLevel ?? availableLevels[availableLevels.length - 1] ?? null);

  const used = feats.length;
  const overLimit = used > featsAvailable;

  function addAt(lvl: number, name: string) {
    onChange([...feats, { level: lvl, name }]);
  }

  function removeEntry(entry: FeatEntry) {
    onChange(feats.filter((f) => f !== entry));
  }

  function goTo(target: number) {
    if (availableLevels.includes(target)) setRequestedLevel(target);
  }

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-100">Feats</h2>
        <span className={`text-sm font-mono ${overLimit ? "text-red-400" : "text-neutral-400"}`}>
          {used} / {featsAvailable} used
        </span>
      </div>

      {level == null ? (
        <p className="text-sm text-neutral-500">Add levels first to plan feats.</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => goTo(availableLevels[availableLevels.indexOf(level) - 1])}
              disabled={availableLevels.indexOf(level) <= 0}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
            >
              &larr; Prev
            </button>
            <select
              value={level}
              onChange={(e) => setRequestedLevel(Number(e.target.value))}
              className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
            >
              {build.levels.map((l) => {
                const count = slotsAtLevel(l.level);
                const have = feats.filter((f) => f.level === l.level).length;
                return (
                  <option key={l.level} value={l.level}>
                    Level {l.level} — {l.className || "unset"}
                    {count > 0 ? ` (${have}/${count} feats)` : ""}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={() => goTo(availableLevels[availableLevels.indexOf(level) + 1])}
              disabled={availableLevels.indexOf(level) >= availableLevels.length - 1}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
            >
              Next &rarr;
            </button>
          </div>

          {(() => {
            const count = slotsAtLevel(level);
            const entries = feats.filter((f) => f.level === level);
            const filled = entries.slice(0, count);
            const emptySlotCount = Math.max(0, count - entries.length);
            const extra = entries.slice(count);

            return (
              <div className="space-y-1.5 mb-3">
                {count === 0 && extra.length === 0 && (
                  <p className="text-sm text-neutral-500">No feat slots earned at level {level}.</p>
                )}
                {filled.map((entry, i) => (
                  <FeatSlotRow
                    key={`${entry.level}-${entry.name}-${i}`}
                    slotLabel={`Slot ${i + 1}/${count}`}
                    build={build}
                    entry={entry}
                    onRemove={() => removeEntry(entry)}
                  />
                ))}
                {Array.from({ length: emptySlotCount }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-2">
                    <span className="text-xs text-neutral-600 font-mono w-20 shrink-0">
                      Slot {filled.length + i + 1}/{count}
                    </span>
                    <InlineFeatFinder onSelect={(name) => addAt(level, name)} />
                  </div>
                ))}
                {extra.length > 0 && (
                  <div className="pt-1.5 mt-1.5 border-t border-neutral-800">
                    <div className="text-xs uppercase tracking-wide text-amber-500 mb-1.5">
                      {count > 0
                        ? `Extra feats at this level (beyond the ${count} earned)`
                        : "Custom feats at this level (none normally earned here)"}
                    </div>
                    <div className="space-y-1.5">
                      {extra.map((entry, i) => (
                        <FeatSlotRow
                          key={`${entry.level}-${entry.name}-extra-${i}`}
                          slotLabel="Extra"
                          build={build}
                          entry={entry}
                          onRemove={() => removeEntry(entry)}
                          extra
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1.5">
                  <span className="text-xs text-neutral-600 w-20 shrink-0">+ Extra</span>
                  <InlineFeatFinder onSelect={(name) => addAt(level, name)} />
                </div>
              </div>
            );
          })()}

          <p className="text-xs text-neutral-500">
            Feat slots are calculated from the Levels table (1st-level bonus, human bonus,
            every-3rd-level bonus, and class bonus feat schedules) — no need to cross-check it
            yourself. Use "+ Extra" to add a DM-granted or homebrew feat beyond the normal
            schedule at any level.
          </p>
        </>
      )}

      {feats.length > 0 && (
        <div className="mt-4 pt-3 border-t border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-300 mb-2">All Selected Feats</h3>
          <div className="space-y-1.5">
            {[...new Map(
              [...feats]
                .sort((a, b) => a.level - b.level)
                .reduce((byLevel, entry) => {
                  const list = byLevel.get(entry.level) ?? [];
                  list.push(entry);
                  byLevel.set(entry.level, list);
                  return byLevel;
                }, new Map<number, FeatEntry[]>())
            )].map(([lvl, entries]) => (
              <div key={lvl} className="flex items-baseline gap-2 text-sm">
                <span className="text-neutral-600 font-mono text-xs w-12 shrink-0">Lv {lvl}</span>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {entries
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((entry, i) => {
                      const category = featCategoryTag(entry.name);
                      return (
                        <span
                          key={`${entry.level}-${entry.name}-${i}`}
                          className="inline-flex items-center gap-1 bg-neutral-800/60 rounded px-2 py-0.5 text-neutral-300"
                        >
                          {entry.name}
                          <span className="text-xs text-neutral-600">({category ?? "custom"})</span>
                          <button
                            type="button"
                            onClick={() => removeEntry(entry)}
                            className="text-neutral-600 hover:text-red-400 text-xs ml-1"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
