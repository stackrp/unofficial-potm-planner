import type { BuildTotals } from "../lib/calculator";

interface Props {
  totals: BuildTotals;
  errors: string[];
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-neutral-700 bg-neutral-950/40 px-3 py-2 text-center">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-2xl font-mono text-neutral-100">{value}</div>
    </div>
  );
}

export function SummaryPanel({ totals, errors }: Props) {
  return (
    <section className="rounded-lg border border-neutral-700 bg-neutral-900/40 p-4">
      <h2 className="text-lg font-semibold text-neutral-100 mb-3">Totals</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
        <Stat label="HP" value={totals.hp} />
        <Stat label="BAB" value={`+${totals.bab}`} />
        <Stat label="Fort" value={`+${totals.fort}`} />
        <Stat label="Ref" value={`+${totals.ref}`} />
        <Stat label="Will" value={`+${totals.will}`} />
        <Stat label="Feats" value={totals.feats} />
      </div>
      <div className="text-sm text-neutral-400">
        Total skill points available: <span className="text-neutral-200 font-mono">{totals.skillPoints}</span>
      </div>

      {errors.length > 0 && (
        <div className="mt-3 rounded-md border border-red-800 bg-red-950/40 p-2">
          <ul className="text-sm text-red-300 list-disc list-inside space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
