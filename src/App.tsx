import { useEffect, useMemo, useState } from "react";
import { AbilityScorePanel } from "./components/AbilityScorePanel";
import { RacePicker } from "./components/RacePicker";
import { BackgroundPicker } from "./components/BackgroundPicker";
import { LevelPlanner } from "./components/LevelPlanner";
import { ClassAbilities } from "./components/ClassAbilities";
import { PrestigeRequirements } from "./components/PrestigeRequirements";
import { DeityPicker } from "./components/DeityPicker";
import { BuildImportExport } from "./components/BuildImportExport";
import { FeatTracker } from "./components/FeatTracker";
import { SkillPlanner } from "./components/SkillPlanner";
import { SkillList } from "./components/SkillList";
import { SummaryPanel } from "./components/SummaryPanel";
import { Guidance } from "./components/Guidance";
import {
  calculateBuild,
  finalAbilityScores,
  abilityModifier,
  maxClassLevels,
  totalEcl,
  trimBuildToLevelCap,
} from "./lib/calculator";
import { loadBuildFromStorage, saveBuildToStorage } from "./lib/buildIO";
import type { Build } from "./types";
import { ABILITY_KEYS } from "./types";

const DEFAULT_BUILD: Build = {
  name: "New Build",
  race: "",
  template: "",
  alignment: "",
  baseAbilityScores: { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 },
  levels: [],
  feats: [],
  skills: [],
  backgrounds: [],
  deity: { hasDeity: false, patronType: "god", pantheon: "", deityName: "", domains: [], favoredWeapon: "" },
};

function App() {
  // Trim any over-cap levels from older saves (pre-ECL cap was 40).
  const [build, setBuild] = useState<Build>(() => trimBuildToLevelCap(loadBuildFromStorage(DEFAULT_BUILD)));
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    saveBuildToStorage(build);
  }, [build]);

  useEffect(() => {
    if (!confirmingReset) return;
    const timer = setTimeout(() => setConfirmingReset(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmingReset]);

  function handleRaceChange(race: string) {
    // Racial ability adjustments (base auto-mod + subrace extra) are applied in
    // finalAbilityScores — baseAbilityScores stay pure point-buy and are never mutated here.
    // Raising ECL may require dropping class levels past the new cap.
    setBuild((prev) => trimBuildToLevelCap({ ...prev, race }));
  }

  function handleTemplateChange(template: string) {
    setBuild((prev) => trimBuildToLevelCap({ ...prev, template }));
  }

  function handleImport(next: Build) {
    setBuild(trimBuildToLevelCap(next));
  }

  function handleLevelsChange(levels: Build["levels"]) {
    // Levels are always contiguous 1..levels.length (LevelPlanner only appends/truncates), so
    // shrinking the array orphans any skill/feat allocation still pointing at a removed level
    // number — drop those too, or they'd silently keep affecting totals with no level to show for it.
    // Also never accept more levels than the ECL-adjusted cap (e.g. import / stale UI).
    const cap = maxClassLevels(build.race, build.template);
    const capped = levels.length > cap ? levels.slice(0, cap) : levels;
    const maxLevel = capped.length;
    setBuild((prev) => ({
      ...prev,
      levels: capped,
      skills: prev.skills.filter((s) => s.level <= maxLevel),
      feats: prev.feats.filter((f) => f.level <= maxLevel),
    }));
  }

  function handleResetClick() {
    if (confirmingReset) {
      setBuild(DEFAULT_BUILD);
      setConfirmingReset(false);
    } else {
      setConfirmingReset(true);
    }
  }

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
  const ecl = useMemo(() => totalEcl(build.race, build.template), [build.race, build.template]);
  const levelCap = useMemo(
    () => maxClassLevels(build.race, build.template),
    [build.race, build.template]
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
          <BuildImportExport build={build} defaultBuild={DEFAULT_BUILD} onImport={handleImport} />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetClick}
            className={`px-2 py-1 rounded text-sm ${
              confirmingReset
                ? "bg-red-700 hover:bg-red-600 text-white"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
            }`}
          >
            {confirmingReset ? "Confirm reset?" : "↻ Reset"}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <RacePicker
          race={build.race}
          onChange={handleRaceChange}
          template={build.template}
          onTemplateChange={handleTemplateChange}
        />

        <DeityPicker
          deity={build.deity}
          onChange={(deity) => setBuild((prev) => ({ ...prev, deity }))}
          alignment={build.alignment}
          onAlignmentChange={(alignment) => setBuild((prev) => ({ ...prev, alignment }))}
        />

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
          template={build.template}
        />

        <SummaryPanel totals={calculated.totals} errors={calculated.errors} />

        <LevelPlanner
          levels={build.levels}
          onChange={handleLevelsChange}
          snapshots={calculated.perLevel}
          maxLevels={levelCap}
          ecl={ecl}
        />

        <ClassAbilities levels={build.levels} />

        <PrestigeRequirements build={build} perLevel={calculated.perLevel} />

        <FeatTracker
          build={build}
          feats={build.feats}
          onChange={(feats) => setBuild((prev) => ({ ...prev, feats }))}
          featsAvailable={calculated.totals.feats}
          perLevel={calculated.perLevel}
        />

        <SkillPlanner
          build={build}
          onChange={(skills) => setBuild((prev) => ({ ...prev, skills }))}
          perLevel={calculated.perLevel}
        />

        <SkillList
          skills={calculated.skills}
          totalEarned={calculated.totals.skillPoints}
          totalBanked={calculated.totals.skillPointsBanked}
        />

        <Guidance build={build} perLevel={calculated.perLevel} />
      </main>
    </div>
  );
}

export default App;
