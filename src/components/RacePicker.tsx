import { useEffect, useMemo, useRef, useState } from "react";
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

interface SubraceOption {
  name: string;
  label: string;
  adjustments: Partial<Record<AbilityKey, number>>;
  ecl: number | null;
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

/** Ability adjustments colored per-stat (green for positive, red for negative). */
function ColoredAdjustments({ adjustments }: { adjustments: Partial<Record<AbilityKey, number>> }) {
  const keys = ABILITY_KEYS.filter((k) => adjustments[k]);
  if (keys.length === 0) return <span className="text-neutral-500">None</span>;
  return (
    <>
      {keys.map((k, i) => (
        <span key={k}>
          {i > 0 && <span className="text-neutral-600">, </span>}
          <span className={adjustments[k]! > 0 ? "text-emerald-400" : "text-red-400"}>
            {adjustments[k]! > 0 ? "+" : ""}
            {adjustments[k]} {k}
          </span>
        </span>
      ))}
    </>
  );
}

/** A subrace's inline dropdown/trigger tagline — ability adjustments plus ECL, colored per-segment.
 * Native <option> elements can only carry a single color for their whole text (verified: nested
 * colored spans get silently dropped), so this only ever renders into plain elements — a custom
 * listbox rather than a real <select>. */
function SubraceTagline({ option }: { option: SubraceOption }) {
  const hasAdjustments = ABILITY_KEYS.some((k) => option.adjustments[k]);
  if (!hasAdjustments && option.ecl == null) return null;
  return (
    <span className="font-mono text-xs">
      {hasAdjustments && (
        <>
          <span className="text-neutral-600"> — </span>
          <ColoredAdjustments adjustments={option.adjustments} />
        </>
      )}
      {option.ecl != null && (
        <>
          <span className="text-neutral-600"> — </span>
          <span className="text-purple-400">ECL +{option.ecl}</span>
        </>
      )}
    </span>
  );
}

/** Custom listbox standing in for a native <select> so each subrace's ability adjustments and ECL
 * can be colored per-segment in the option list — a native <option> can't do that (see
 * SubraceTagline). Mirrors a native select's behavior: click or Enter/Space to open, arrow keys to
 * move, Enter to choose, Escape or an outside click to close. */
function SubraceSelect({
  options,
  value,
  onChange,
  disabled,
}: {
  options: SubraceOption[];
  value: string;
  onChange: (name: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.name === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.name === value);
      setHighlighted(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[highlighted];
      if (opt) {
        onChange(opt.name);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between gap-2 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm disabled:opacity-30 text-left"
      >
        <span className="truncate">
          {selected && (
            <>
              {selected.label}
              <SubraceTagline option={selected} />
            </>
          )}
        </span>
        <span className="text-neutral-500 text-xs shrink-0">▾</span>
      </button>
      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded border border-neutral-700 bg-neutral-950 shadow-lg text-sm"
        >
          {options.map((opt, i) => (
            <li
              key={opt.name}
              role="option"
              aria-selected={opt.name === value}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => {
                onChange(opt.name);
                setOpen(false);
              }}
              className={`px-2 py-1 cursor-pointer ${i === highlighted ? "bg-neutral-800" : ""} ${
                opt.name === value ? "text-neutral-100" : "text-neutral-300"
              }`}
            >
              {opt.label}
              <SubraceTagline option={opt} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RacePicker({ race, onChange }: Props) {
  // Derived from `race` rather than tracked as its own state — `race` can change externally
  // (e.g. importing a build), and a separately-tracked category would go stale in that case.
  const category = categoryForRace(race) ?? "";

  const subraces = useMemo(() => subracesForCategory(category), [category]);
  const defaultRace = useMemo(() => defaultRaceForCategory(category), [category]);
  const selected = race ? getRace(race) : undefined;

  const subraceOptions: SubraceOption[] = useMemo(
    () =>
      subraces.map((name) => {
        const def = getRace(name);
        return {
          name,
          label: name === defaultRace ? `${name} (no subrace)` : name,
          adjustments: totalAdjustments(name, def?.abilityAdjustments ?? {}),
          ecl: def?.effectiveCharacterLevel ?? null,
        };
      }),
    [subraces, defaultRace]
  );

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
        <SubraceSelect options={subraceOptions} value={race} onChange={onChange} disabled={!category} />
      </div>

      {selected && (
        <div className="rounded-md border border-neutral-700 bg-neutral-950/40 p-3 text-sm space-y-2">
          <div>
            <span className="text-neutral-500">Ability adjustments: </span>
            <span className="font-mono">
              <ColoredAdjustments adjustments={totalAdjustments(race, selected.abilityAdjustments)} />
            </span>
          </div>
          {selected.effectiveCharacterLevel != null && (
            <div>
              <span className="text-neutral-500">Effective Character Level: </span>
              <span className="text-purple-400 font-mono">+{selected.effectiveCharacterLevel}</span>
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
              <span className="text-neutral-500 block mb-1">Traits:</span>
              <div className="flex flex-wrap gap-1">
                {selected.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-300"
                  >
                    {trait}
                  </span>
                ))}
              </div>
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
