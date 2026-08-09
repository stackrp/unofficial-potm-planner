import { useMemo, useState } from "react";
import { MAX_DOMAINS, getDomain } from "../data/clericDomains";
import { deitiesMatching, getDeity, unionDomains, unionWeapons } from "../data/deities";
import { ALIGNMENT_DESCRIPTIONS, ALIGNMENT_LABELS, withinOneStep } from "../lib/alignment";
import type { DeitySelection } from "../types";

interface Props {
  deity: DeitySelection;
  onChange: (deity: DeitySelection) => void;
  alignment: string;
  onAlignmentChange: (alignment: string) => void;
}

const ALIGNMENT_GRID: string[][] = [
  ["LG", "NG", "CG"],
  ["LN", "TN", "CN"],
  ["LE", "NE", "CE"],
];

export function DeityPicker({ deity, onChange, alignment, onAlignmentChange }: Props) {
  const [deityFilter, setDeityFilter] = useState("");

  const selectedDeity = deity.deityName ? getDeity(deity.pantheon, deity.deityName) : undefined;
  const selectedDomains = deity.domains.filter((d) => d !== "");
  const selectedWeapon = deity.favoredWeapon;

  // The single source of truth for cross-filtering: every deity compatible with the
  // domains AND weapon picked so far. Domain/weapon option lists and the deity dropdown
  // are all derived from this, so picking any one of the three narrows the other two.
  const candidateDeities = useMemo(
    () => deitiesMatching(selectedDomains, selectedWeapon),
    [selectedDomains, selectedWeapon]
  );

  const domainOptions = useMemo(
    () => (selectedDeity ? [...selectedDeity.domains].sort() : unionDomains(candidateDeities)),
    [selectedDeity, candidateDeities]
  );

  const weaponOptions = useMemo(
    () => (selectedDeity ? [...selectedDeity.weaponAlternatives].sort() : unionWeapons(candidateDeities)),
    [selectedDeity, candidateDeities]
  );

  const matchingDeities = useMemo(() => {
    if (!deityFilter.trim()) return candidateDeities;
    const q = deityFilter.trim().toLowerCase();
    return candidateDeities.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.altName ?? "").toLowerCase().includes(q)
    );
  }, [candidateDeities, deityFilter]);

  const matchingByPantheon = useMemo(() => {
    const map = new Map<string, typeof matchingDeities>();
    for (const d of matchingDeities) {
      const list = map.get(d.pantheon) ?? [];
      list.push(d);
      map.set(d.pantheon, list);
    }
    return map;
  }, [matchingDeities]);

  function setHasDeity(hasDeity: boolean) {
    onChange({ ...deity, hasDeity });
  }

  function setDeitySelection(pantheon: string, deityName: string) {
    // Picked from candidateDeities, so it's already guaranteed compatible with whatever
    // domains/weapon are currently set — no reconciliation needed, just fill gaps.
    const newDeity = deityName ? getDeity(pantheon, deityName) : undefined;
    onChange({
      ...deity,
      pantheon,
      deityName,
      favoredWeapon: deity.favoredWeapon || newDeity?.weaponAlternatives[0] || "",
    });
    if (newDeity?.alignment && (!alignment || !withinOneStep(alignment, newDeity.alignment))) {
      onAlignmentChange(newDeity.alignment);
    }
  }

  function setDomainSlot(index: number, value: string) {
    const next = [...deity.domains];
    while (next.length < MAX_DOMAINS) next.push("");
    next[index] = value;
    onChange({ ...deity, domains: next });
  }

  function setWeapon(value: string) {
    onChange({ ...deity, favoredWeapon: value });
  }

  function clearAll() {
    onAlignmentChange("");
    onChange({ hasDeity: false, pantheon: "", deityName: "", domains: [], favoredWeapon: "" });
  }

  const domainSlots = Array.from({ length: MAX_DOMAINS }, (_, i) => deity.domains[i] ?? "");
  const hasSelection = !!alignment || deity.hasDeity || !!deity.deityName || selectedDomains.length > 0;

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-100">Alignment</h2>
        <button
          type="button"
          onClick={clearAll}
          disabled={!hasSelection}
          title="Clear alignment & deity"
          className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 disabled:opacity-30 text-sm"
        >
          &#8635; Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        <div>
          <div className="grid grid-cols-3 gap-1 w-56">
            {ALIGNMENT_GRID.flat().map((code) => {
              const compatible = !selectedDeity?.alignment || withinOneStep(code, selectedDeity.alignment);
              const isSelected = alignment === code;
              return (
                <button
                  key={code}
                  type="button"
                  title={ALIGNMENT_LABELS[code]}
                  onClick={() => onAlignmentChange(code)}
                  className={`px-2 py-1.5 rounded text-sm font-mono border transition-colors ${
                    isSelected
                      ? "bg-violet-700 border-violet-500 text-white"
                      : compatible
                      ? "bg-neutral-950 border-neutral-700 text-neutral-200 hover:border-violet-500"
                      : "bg-neutral-950 border-neutral-800 text-neutral-600"
                  }`}
                >
                  {code}
                </button>
              );
            })}
          </div>
          {selectedDeity?.alignment &&
            (ALIGNMENT_GRID.flat().some((code) => !withinOneStep(code, selectedDeity.alignment!)) ? (
              <p className="mt-1 text-xs text-neutral-500 w-56">
                Dimmed alignments are more than one step from {selectedDeity.name}'s ({selectedDeity.alignment}).
              </p>
            ) : (
              <p className="mt-1 text-xs text-neutral-500 w-56">
                {selectedDeity.name}'s alignment ({selectedDeity.alignment}) sits at the center of the
                grid, so every alignment is within one step — none are dimmed.
              </p>
            ))}
          {alignment && (
            <div className="mt-3 rounded-md border border-neutral-700 bg-neutral-950/40 p-3 text-xs text-neutral-400 w-56">
              <div className="text-neutral-200 font-medium mb-1">{ALIGNMENT_LABELS[alignment]}</div>
              <p>{ALIGNMENT_DESCRIPTIONS[alignment]}</p>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-800 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">Deity</h3>
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input type="checkbox" checked={deity.hasDeity} onChange={(e) => setHasDeity(e.target.checked)} />
              Character has a deity/patron
            </label>
          </div>

          {deity.hasDeity && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-500">
                Domains, deity, and favored weapon all cross-filter each other — pick any one (or
                two) and the rest narrow to what's actually compatible.
              </p>

              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
                  Domains (pick up to {MAX_DOMAINS})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {domainSlots.map((value, i) => {
                    const otherValue = domainSlots[1 - i];
                    const def = value ? getDomain(value) : undefined;
                    return (
                      <div key={i} className="rounded-md border border-neutral-700 bg-neutral-950/40 p-3">
                        <select
                          value={value}
                          onChange={(e) => setDomainSlot(i, e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm mb-2"
                        >
                          <option value="">— None selected —</option>
                          {domainOptions
                            .filter((n) => n === value || n !== otherValue)
                            .map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                        </select>
                        {def && (
                          <div className="text-xs text-neutral-400">
                            <p className="text-neutral-300">{def.specialAbility || "No special ability."}</p>
                            {def.bonusSpells.length > 0 && (
                              <p className="mt-1 text-neutral-500">
                                Bonus spells:{" "}
                                {def.bonusSpells.map((s) => `${s.spell} (${s.level})`).join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Favored Weapon</div>
                <select
                  value={selectedWeapon}
                  onChange={(e) => setWeapon(e.target.value)}
                  className="w-64 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
                >
                  <option value="">— None selected —</option>
                  {weaponOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-neutral-500">
                  {selectedDeity
                    ? `Showing only ${selectedDeity.name}'s weapon(s).`
                    : `${weaponOptions.length} weapon${weaponOptions.length === 1 ? "" : "s"} available given the domains picked above.`}
                </p>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
                  Deity ({matchingDeities.length} match{matchingDeities.length === 1 ? "" : "es"})
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Filter by name..."
                    value={deityFilter}
                    onChange={(e) => setDeityFilter(e.target.value)}
                    className="w-48 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
                  />
                  <select
                    value={deity.deityName ? `${deity.pantheon}::${deity.deityName}` : ""}
                    onChange={(e) => {
                      if (!e.target.value) return setDeitySelection("", "");
                      const [pantheon, name] = e.target.value.split("::");
                      setDeitySelection(pantheon, name);
                    }}
                    className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-neutral-100 text-sm"
                  >
                    <option value="">— None selected —</option>
                    {[...matchingByPantheon.entries()].map(([pantheon, ds]) => (
                      <optgroup key={pantheon} label={pantheon}>
                        {ds.map((d) => (
                          <option key={`${pantheon}::${d.name}`} value={`${pantheon}::${d.name}`}>
                            {d.name}
                            {d.altName ? ` / ${d.altName}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {selectedDeity && (
                  <div className="rounded-md border border-neutral-700 bg-neutral-950/40 p-3 text-sm space-y-1">
                    <div>
                      <span className="text-neutral-500">Pantheon: </span>
                      <span className="text-neutral-200">{selectedDeity.pantheon}</span>
                      {selectedDeity.subgroup && (
                        <span className="text-neutral-500"> ({selectedDeity.subgroup})</span>
                      )}
                    </div>
                    <div>
                      <span className="text-neutral-500">Domains: </span>
                      <span className="text-neutral-200 font-mono">{selectedDeity.domains.join(", ")}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Deity's alignment: </span>
                      <span className="text-neutral-200 font-mono">{selectedDeity.alignment ?? "—"}</span>
                    </div>
                    {selectedDeity.symbol && (
                      <div>
                        <span className="text-neutral-500">Symbol: </span>
                        <span className="text-neutral-300">{selectedDeity.symbol}</span>
                      </div>
                    )}
                    {selectedDeity.portfolio.length > 0 && (
                      <div>
                        <span className="text-neutral-500">Portfolio: </span>
                        <span className="text-neutral-300">{selectedDeity.portfolio.join(", ")}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
