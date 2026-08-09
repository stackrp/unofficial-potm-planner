import { useRef, useState } from "react";
import { BuildParseError, downloadBuild, parseBuildFile } from "../lib/buildIO";
import type { Build } from "../types";

interface Props {
  build: Build;
  defaultBuild: Build;
  onImport: (build: Build) => void;
}

export function BuildImportExport({ build, defaultBuild, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // clear so importing the same filename again still fires onChange
    if (!file) return;
    try {
      const imported = parseBuildFile(await file.text(), defaultBuild);
      onImport(imported);
      setError(null);
    } catch (err) {
      setError(err instanceof BuildParseError ? err.message : "Couldn't read that file.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => downloadBuild(build)}
        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
