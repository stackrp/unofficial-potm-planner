import type { Build } from "../types";

const SCHEMA_VERSION = 1;

interface BuildFile {
  schemaVersion: number;
  build: Build;
}

export function serializeBuild(build: Build): string {
  const file: BuildFile = { schemaVersion: SCHEMA_VERSION, build };
  return JSON.stringify(file, null, 2);
}

function sanitizeFilename(name: string): string {
  const cleaned = name.trim().replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "-");
  return cleaned.slice(0, 60) || "build";
}

/** Triggers a browser download of `build` as a .json file. */
export function downloadBuild(build: Build): void {
  const blob = new Blob([serializeBuild(build)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(build.name)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const STORAGE_KEY = "potm-build-planner:current-build";

/** Persists `build` to localStorage so it survives a refresh or the browser closing. */
export function saveBuildToStorage(build: Build): void {
  try {
    localStorage.setItem(STORAGE_KEY, serializeBuild(build));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — persistence just doesn't happen.
  }
}

/** Loads the last-saved build from localStorage, falling back to `fallback` if none is stored or it's unreadable. */
export function loadBuildFromStorage(fallback: Build): Build {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseBuildFile(raw, fallback) : fallback;
  } catch {
    return fallback;
  }
}

export class BuildParseError extends Error {}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Parses an exported build file. Missing or malformed fields fall back to `fallback` (the app's
 * default build) field-by-field, so a file from an older/newer schema version degrades
 * gracefully instead of crashing the app.
 */
export function parseBuildFile(text: string, fallback: Build): Build {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BuildParseError("That file isn't valid JSON.");
  }
  if (!isRecord(parsed)) {
    throw new BuildParseError("That file doesn't look like a build export.");
  }
  const raw = isRecord(parsed.build) ? parsed.build : parsed;
  if (typeof raw.name !== "string" && typeof raw.race !== "string" && !Array.isArray(raw.levels)) {
    throw new BuildParseError("That file doesn't look like a build export.");
  }

  return {
    name: typeof raw.name === "string" ? raw.name : fallback.name,
    race: typeof raw.race === "string" ? raw.race : fallback.race,
    alignment: typeof raw.alignment === "string" ? raw.alignment : fallback.alignment,
    baseAbilityScores: {
      ...fallback.baseAbilityScores,
      ...(isRecord(raw.baseAbilityScores) ? raw.baseAbilityScores : {}),
    },
    levels: Array.isArray(raw.levels) ? (raw.levels as Build["levels"]) : fallback.levels,
    feats: Array.isArray(raw.feats) ? (raw.feats as Build["feats"]) : fallback.feats,
    skills: Array.isArray(raw.skills) ? (raw.skills as Build["skills"]) : fallback.skills,
    backgrounds: Array.isArray(raw.backgrounds) ? (raw.backgrounds as Build["backgrounds"]) : fallback.backgrounds,
    deity: { ...fallback.deity, ...(isRecord(raw.deity) ? raw.deity : {}) },
  };
}
