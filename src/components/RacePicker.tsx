import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { getRace } from "../data/races";
import {
  BASE_RACE_CATEGORIES,
  categoryForRace,
  defaultRaceForCategory,
  subracesForCategoryGroupedBySetting,
} from "../data/raceCategories";
import { TEMPLATES, getTemplate } from "../data/templates";
import { ABSOLUTE_LEVEL_CAP, racialAbilityAdjustments } from "../lib/calculator";
import { ABILITY_KEYS, type AbilityKey } from "../types";

interface Props {
  race: string;
  onChange: (race: string) => void;
  template: string;
  onTemplateChange: (template: string) => void;
}

interface SubraceOption {
  name: string;
  label: string;
  adjustments: Partial<Record<AbilityKey, number>>;
  ecl: number | null;
  /** Setting header to render immediately before this option, when it starts a new group. */
  group?: string;
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
            <Fragment key={opt.name || `option-${i}`}>
              {opt.group && opt.group !== options[i - 1]?.group && (
                <li
                  aria-hidden="true"
                  className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 bg-neutral-900 select-none"
                >
                  {opt.group}
                </li>
              )}
              <li
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
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}

export function RacePicker({ race, onChange, template, onTemplateChange }: Props) {
  // Derived from `race` rather than tracked as its own state — `race` can change externally
  // (e.g. importing a build), and a separately-tracked category would go stale in that case. This
  // requires every race name to be unique to a single category (see raceCategories.ts) — a name
  // reused across categories would always resolve to whichever comes first in
  // BASE_RACE_CATEGORIES, no matter which category the player actually picked it under.
  const category = categoryForRace(race) ?? "";

  const defaultRace = useMemo(() => defaultRaceForCategory(category), [category]);
  const selected = race ? getRace(race) : undefined;

  // The category's own base race (no subrace template) stays pinned above the setting
  // groups — it's available regardless of the character's setting of origin, so it
  // shouldn't be filed under any one of them. Everything else is grouped by setting
  // and alphabetized within each group (see subracesForCategoryGroupedBySetting).
  const subraceOptions: SubraceOption[] = useMemo(() => {
    function toOption(name: string, group?: string): SubraceOption {
      const def = getRace(name);
      return {
        name,
        label: name === defaultRace ? `${name} (no subrace)` : name,
        // Base auto-mod + subrace extra (no template — that's a separate picker).
        adjustments: racialAbilityAdjustments(name),
        ecl: def?.effectiveCharacterLevel ?? null,
        group,
      };
    }
    const options: SubraceOption[] = [];
    if (defaultRace) options.push(toOption(defaultRace));
    for (const { setting, races } of subracesForCategoryGroupedBySetting(category)) {
      for (const name of races) options.push(toOption(name, setting));
    }
    return options;
  }, [category, defaultRace]);

  function handleCategoryChange(nextCategory: string) {
    onChange(nextCategory ? defaultRaceForCategory(nextCategory) ?? "" : "");
  }

  const templateOptions: SubraceOption[] = useMemo(
    () => [
      { name: "", label: "— No template —", adjustments: {}, ecl: null },
      ...TEMPLATES.map((t) => ({
        name: t.name,
        label: t.name,
        adjustments: t.abilityAdjustments,
        ecl: t.effectiveCharacterLevel,
      })),
    ],
    []
  );
  const templateDef = getTemplate(template);

  // Combined so the summary card below reads like a single character sheet — race/subrace and
  // the selected template's bonuses stack together (same stack finalAbilityScores uses).
  const combinedAdjustments: Partial<Record<AbilityKey, number>> = selected
    ? racialAbilityAdjustments(race, template)
    : templateDef
      ? { ...templateDef.abilityAdjustments }
      : {};
  const combinedEcl = (selected?.effectiveCharacterLevel ?? 0) + (templateDef?.effectiveCharacterLevel ?? 0);
  // A subrace-less Human keeps earning +1 skill point every level; a Human subrace (Axani,
  // Tiefling, etc.) only ever gets that bonus once — see calculator.ts's identical split.
  const isHumanNoSubrace = race === "Humans";
  const isHumanWithSubrace = category === "Humans" && !isHumanNoSubrace;

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <h2 className="text-lg font-semibold text-neutral-100 mb-3">Race / Subrace</h2>
      <div className="flex gap-2 mb-2">
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

      <div className="mb-3">
        <SubraceSelect options={templateOptions} value={template} onChange={onTemplateChange} disabled={false} />
      </div>

      {(selected || templateDef) && (
        <div className="rounded-md border border-neutral-700 bg-neutral-950/40 p-3 text-sm space-y-3">
          <div>
            <span className="text-neutral-500">Ability adjustments: </span>
            <span className="font-mono">
              <ColoredAdjustments adjustments={combinedAdjustments} />
            </span>
          </div>
          {(isHumanNoSubrace || isHumanWithSubrace) && (
            <div>
              <span className="text-neutral-500">Human bonus: </span>
              {templateDef?.removesHumanSkillPointBonus ? (
                <span className="text-violet-400">
                  Bonus feat only (bonus skill point lost — {templateDef.name})
                </span>
              ) : isHumanNoSubrace ? (
                <span className="text-violet-400">Bonus feat + skill point every level</span>
              ) : (
                <span className="text-violet-400">Bonus feat + one-time skill point (no further points per level)</span>
              )}
            </div>
          )}
          {combinedEcl > 0 && (
            <div>
              <span className="text-neutral-500">Effective Character Level: </span>
              <span className="text-purple-400 font-mono">+{combinedEcl}</span>
              <span className="text-neutral-500">
                {" "}
                — max class levels {Math.max(0, ABSOLUTE_LEVEL_CAP - combinedEcl)} (of{" "}
                {ABSOLUTE_LEVEL_CAP})
              </span>
            </div>
          )}
          {(selected?.baseOutcastRating != null || templateDef?.outcastRatingIncrease != null) && (
            <div>
              <span className="text-neutral-500 block mb-1">Outcast Rating: </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
                {selected?.baseOutcastRating != null && (
                  <span className="text-neutral-100">Base {selected.baseOutcastRating}</span>
                )}
                {templateDef?.outcastRatingIncrease != null && (
                  <span className="text-neutral-300">
                    +{templateDef.outcastRatingIncrease} or more ({templateDef.name})
                  </span>
                )}
              </div>
            </div>
          )}
          {selected && selected.traits.length > 0 && (
            <div>
              <span className="text-neutral-500 block mb-1">Race Traits:</span>
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
          {selected && selected.notes.length > 0 && (
            <div className="text-xs text-neutral-500 italic">
              {selected.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </div>
          )}

          {templateDef && (
            <div className="rounded border border-purple-800/40 bg-purple-950/10 p-2">
              <div className="flex flex-wrap items-center gap-x-2 mb-1">
                <span className="font-semibold text-neutral-100">{templateDef.name}</span>
                {templateDef.requiresApplication && (
                  <span className="rounded-full border border-amber-700 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-400">
                    Requires application
                  </span>
                )}
              </div>
              <div className="text-xs text-neutral-500 italic mb-1">{templateDef.restriction}</div>
              {templateDef.traits.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {templateDef.traits.map((trait) => (
                    <span
                      key={trait}
                      className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-300"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              )}
              {templateDef.notes.length > 0 && (
                <div className="text-xs text-neutral-500 italic space-y-0.5">
                  {templateDef.notes.map((n, i) => (
                    <p key={i}>{n}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
