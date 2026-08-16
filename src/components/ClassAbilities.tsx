import { useState } from "react";
import { abilitiesGainedThroughBuild } from "../lib/classAbilities";
import type { LevelEntry } from "../types";

interface Props {
  levels: LevelEntry[];
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
            Class features from nwnravenloft.fandom.com, in the order your plan gains them. Some of
            these grant a specific feat automatically (called out in the description) rather than a
            free feat choice — check here before assuming an open feat slot at that level.
          </p>

          {gained.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {hasClasses
                ? "None of the classes in this plan have any listed abilities."
                : "No class levels chosen yet — abilities will appear here as you plan levels."}
            </p>
          ) : (
            <ul className="space-y-2">
              {gained.map((a, i) => (
                <li key={i} className="rounded-md border border-neutral-800 bg-neutral-950/40 px-3 py-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-mono text-neutral-500">Lv{a.characterLevel}</span>
                    <span className="text-xs text-neutral-500">
                      {a.className} (class lvl {a.classLevel})
                    </span>
                    <span className="text-sm font-medium text-neutral-200">{a.title}</span>
                  </div>
                  <p className="text-sm text-neutral-400 mt-0.5">{a.description}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
