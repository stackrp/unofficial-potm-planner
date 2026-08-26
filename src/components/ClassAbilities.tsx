import { useState } from "react";
import { abilitiesGainedThroughBuild } from "../lib/classAbilities";
import { AUTO_CLASS_FEATS } from "../data/autoFeats";
import type { LevelEntry } from "../types";

interface Props {
  levels: LevelEntry[];
}

/** True if this class ability is also one of AUTO_CLASS_FEATS's automatic feat grants — i.e. it's
 * a free feat the character already has, not an open feat-slot choice. */
function grantedFeatFor(className: string, classLevel: number, title: string): string | null {
  const normalized = title.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const grant = (AUTO_CLASS_FEATS[className] ?? []).find(
    (g) => g.level === classLevel && g.featName === normalized
  );
  return grant ? grant.featName : null;
}

export function ClassAbilities({ levels }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const gained = abilitiesGainedThroughBuild(levels);
  const hasClasses = levels.some((l) => l.className);

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 text-lg font-semibold text-neutral-100"
      >
        <span className={`inline-block transition-transform ${collapsed ? "-rotate-90" : ""}`}>&#9662;</span>
        Class Abilities
        {collapsed && gained.length > 0 && (
          <span className="text-sm font-normal text-neutral-500">({gained.length})</span>
        )}
      </button>

      {!collapsed && (
        <>
          <p className="text-xs text-neutral-500 mt-1 mb-3">
            Class features from nwnravenloft.fandom.com, in the order your plan gains them. Entries
            tagged <span className="text-emerald-400">free feat</span> grant a specific feat
            automatically — the planner already counts it as owned for prerequisite checks, and it
            doesn't use up a feat slot.
          </p>

          {gained.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {hasClasses
                ? "None of the classes in this plan have any listed abilities."
                : "No class levels chosen yet — abilities will appear here as you plan levels."}
            </p>
          ) : (
            <ul className="space-y-2">
              {gained.map((a, i) => {
                const featName = grantedFeatFor(a.className, a.classLevel, a.title);
                return (
                  <li key={i} className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-mono text-neutral-500">Lv{a.characterLevel}</span>
                      <span className="text-xs text-neutral-500">
                        {a.className} (class lvl {a.classLevel})
                      </span>
                      <span className="text-sm font-medium text-neutral-200">{a.title}</span>
                      {featName && (
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-950/40 rounded px-1.5 py-0.5">
                          free feat: {featName}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-400 mt-0.5">{a.description}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
