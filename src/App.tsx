import { useMemo, useState } from "react";
import { AbilityScorePanel } from "./components/AbilityScorePanel";
import { RacePicker } from "./components/RacePicker";
import { BackgroundPicker } from "./components/BackgroundPicker";
import { LevelPlanner } from "./components/LevelPlanner";
import { DeityPicker } from "./components/DeityPicker";
import { FeatTracker } from "./components/FeatTracker";
import { SkillList } from "./components/SkillList";
import { SummaryPanel } from "./components/SummaryPanel";
import { calculateBuild, finalAbilityScores, abilityModifier } from "./lib/calculator";
import { categoryForRace } from "./data/raceCategories";
import type { Build } from "./types";
import { ABILITY_KEYS } from "./types";

const DEFAULT_BUILD: Build = {
  name: "New Build",
  race: "",
  alignment: "",
  baseAbilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
  levels: [],
  feats: [],
  skills: [],
  backgrounds: [],
  deity: { hasDeity: false, pantheon: "", deityName: "", domains: [], favoredWeapon: "" },
};

function App() {
  const [build, setBuild] = useState<Build>(DEFAULT_BUILD);

  const calculated = useMemo(() => calculateBuild(build), [build]);
  const finalScores = useMemo(() => finalAbilityScores(build), [build]);
  const finalMods = useMemo(
    () =>
      Object.fromEntries(ABILITY_KEYS.map((k) => [k, abilityModifier(finalScores[k])])) as Record<
        (typeof ABILITY_KEYS)[number],
        number
      >,
    [finalScores]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">POTM Build Planner</h1>
          <input
            type="text"
            value={build.name}
            onChange={(e) => setBuild((prev) => ({ ...prev, name: e.target.value }))}
            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
          />
        </div>
        {categoryForRace(build.race) === "Humans" && (
          <span className="text-sm text-violet-400">Human bonus feat + skill point applied</span>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <RacePicker race={build.race} onChange={(race) => setBuild((prev) => ({ ...prev, race }))} />

        <BackgroundPicker
          backgrounds={build.backgrounds}
          onChange={(backgrounds) => setBuild((prev) => ({ ...prev, backgrounds }))}
        />

        <AbilityScorePanel
          scores={build.baseAbilityScores}
          onChange={(scores) => setBuild((prev) => ({ ...prev, baseAbilityScores: scores }))}
          finalScores={finalScores}
          finalMods={finalMods}
          race={build.race}
        />

        <SummaryPanel totals={calculated.totals} errors={calculated.errors} />

        <LevelPlanner
          levels={build.levels}
          onChange={(levels) => setBuild((prev) => ({ ...prev, levels }))}
          snapshots={calculated.perLevel}
        />

        <DeityPicker
          deity={build.deity}
          onChange={(deity) => setBuild((prev) => ({ ...prev, deity }))}
          alignment={build.alignment}
          onAlignmentChange={(alignment) => setBuild((prev) => ({ ...prev, alignment }))}
        />

        <FeatTracker
          feats={build.feats}
          onChange={(feats) => setBuild((prev) => ({ ...prev, feats }))}
          featsAvailable={calculated.totals.feats}
          maxLevel={build.levels.length}
        />

        <SkillList
          allocations={build.skills}
          onChange={(skills) => setBuild((prev) => ({ ...prev, skills }))}
          skills={calculated.skills}
          skillPointsAvailable={calculated.totals.skillPoints}
        />
      </main>
    </div>
  );
}

export default App;
