import type { Build } from "../types";
import type { LevelSnapshot } from "../lib/calculator";
import { evaluatePrestigeClasses } from "../lib/prestigeRules";

interface Props {
  build: Build;
  perLevel: LevelSnapshot[];
}

export function PrestigeRequirements({ build, perLevel }: Props) {
  const evaluations = evaluatePrestigeClasses(build, perLevel);

  if (evaluations.length === 0) return null;

  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <h2 className="text-lg font-semibold text-neutral-100 mb-1">Prestige Class Requirements</h2>
      <p className="text-xs text-neutral-500 mb-3">
        Checked against nwnravenloft.fandom.com. Skill checks use the ranks you'd actually have
        banked by the level you take the class, not your build's final ranks.
      </p>

      <div className="space-y-3">
        {evaluations.map((ev) => (
          <div
            key={ev.className}
            className={`rounded-md border p-3 ${
              !ev.available
                ? "border-neutral-700 bg-neutral-950/60"
                : ev.meetsAllChecked
                  ? "border-emerald-800 bg-emerald-950/20"
                  : "border-red-800 bg-red-950/30"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-neutral-100">{ev.displayName}</span>
              <span className="text-xs text-neutral-500">
                taken at level {ev.takenAtLevel} &middot; {ev.levelsTaken} level(s) planned
              </span>
              {!ev.available && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  Unavailable on this server
                </span>
              )}
              {ev.available && ev.requiresApplication && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300">
                  Requires forum application
                </span>
              )}
              {ev.available && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    ev.meetsAllChecked ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"
                  }`}
                >
                  {ev.meetsAllChecked ? "Meets checked requirements" : "Missing requirements"}
                </span>
              )}
            </div>

            {ev.checks.length > 0 && (
              <ul className="text-sm space-y-0.5 mt-2">
                {ev.checks.map((c, i) => (
                  <li key={i} className={c.met ? "text-emerald-300" : "text-red-300"}>
                    <span className="font-mono mr-1">{c.met ? "[met]" : "[missing]"}</span>
                    {c.label}
                  </li>
                ))}
              </ul>
            )}

            {ev.manualNotes.length > 0 && (
              <ul className="text-xs text-neutral-400 list-disc list-inside mt-2 space-y-0.5">
                {ev.manualNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}

            <a
              href={ev.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-violet-400 hover:text-violet-300 mt-2 inline-block"
            >
              Source
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
