import { useState } from "react";
import { BACKGROUND_NAMES, BACKGROUND_SKILLS, MAX_BACKGROUNDS, getBackground } from "../data/backgrounds";

interface Props {
  backgrounds: string[];
  onChange: (backgrounds: string[]) => void;
}

export function BackgroundPicker({ backgrounds, onChange }: Props) {
  const [skillFilters, setSkillFilters] = useState<string[]>([]);
  const slots = Array.from({ length: MAX_BACKGROUNDS }, (_, i) => backgrounds[i] ?? "");

  function setSlot(index: number, value: string) {
    // Keep slot positions stable (don't compact away empty slots) — filtering here would
    // shift a later slot's value into an earlier, just-cleared slot on the next render.
    const next = [...slots];
    next[index] = value;
    onChange(next);
  }

  function toggleSkillFilter(skill: string) {
    setSkillFilters((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  // OR match: a background passes the filter if it grants a bonus to any selected skill.
  const matchesFilter = (name: string) => {
    if (skillFilters.length === 0) return true;
    const bg = getBackground(name)!;
    return bg.skillBonuses.some((s) => skillFilters.includes(s));
  };

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-100">Backgrounds</h2>
        {skillFilters.length > 0 && (
          <button
            type="button"
            onClick={() => setSkillFilters([])}
            className="text-xs text-neutral-400 hover:text-neutral-200 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Filter by skill
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BACKGROUND_SKILLS.map((skill) => {
            const active = skillFilters.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkillFilter(skill)}
                className={`px-2 py-1 rounded text-xs border transition-colors ${
                  active
                    ? "bg-violet-700 border-violet-500 text-white"
                    : "bg-neutral-950 border-neutral-700 text-neutral-300 hover:border-violet-500"
                }`}
              >
                {skill}
              </button>
            );
          })}
        </div>
        {skillFilters.length > 0 && (
          <p className="mt-1 text-xs text-neutral-500">
            Showing backgrounds that grant a bonus to {skillFilters.join(" or ")}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((value, i) => {
          const otherValue = slots[1 - i];
          const def = value ? getBackground(value) : undefined;
          const options = BACKGROUND_NAMES.filter(
            (n) => n === value || (n !== otherValue && matchesFilter(n))
          );
          return (
            <div key={i} className="rounded-md border border-neutral-700 bg-neutral-950/40 p-3">
              <select
                value={value}
                onChange={(e) => setSlot(i, e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm mb-2"
              >
                <option value="">— None selected —</option>
                {options.map((n) => {
                  const bg = getBackground(n)!;
                  return (
                    <option key={n} value={n}>
                      {n} (+1 {bg.skillBonuses.join(", ")})
                    </option>
                  );
                })}
              </select>
              {def && (
                <div className="text-xs text-neutral-400">
                  <span className="text-violet-400 font-mono">+1</span> {def.skillBonuses.join(", ")}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        These are "soft" bonuses — they don't count toward skill point cost, max rank, or
        whether a skill counts as trained.
      </p>
    </section>
  );
}
