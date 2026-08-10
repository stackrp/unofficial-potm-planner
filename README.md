# POTM Build Planner

An unofficial character build planner for **Prisoners of the Mist** (PotM), a Neverwinter Nights: Ravenloft persistent world. It's a single-page web app that lets you plan a character from level 1 up, tracking every rule the server cares about along the way, and warning you before you paint yourself into a corner.

Live build tool, no server-side account needed — everything is saved to your browser and can be exported/imported as a JSON file to back up or share a build.

## Features

- **Race, subrace, template, deity, and background selection** — picking a race/subrace or an optional racial template (Draconic Ancestry, Feytouched, etc.) auto-applies its ability score modifiers; deity choice is scoped to alignment and offers matching domains/favored weapons for divine casters.
- **Ability score allocation** with point-buy-style base scores plus a live view of final scores and modifiers after racial bonuses.
- **Level-by-level planning** — add classes level by level and see a running snapshot (BAB, saves, skill points, feats available) at each level.
- **Feat tracker** that enforces prerequisites (ability scores, BAB, prior feats, class/subtype requirements) and only offers feats when a level actually has a slot for them.
- **Skill point planner** with cross-class cost and multiclass skill point rules, plus a running total of points earned vs. spent vs. banked.
- **Prestige class requirement tracking** — see which prestige classes a build currently qualifies for and what's still missing.
- **Class abilities overview** summarizing the special abilities granted by each class level taken.
- **Guidance panel** that flags unresolved choices and rule violations (e.g. missing skill/feat selections, invalid prerequisites) so a build doesn't silently go wrong.
- **Import/export** builds as JSON, with graceful fallback for older/edited files, plus autosave to `localStorage` between visits.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev/build tooling
- [Tailwind CSS 4](https://tailwindcss.com/) for styling
- [Oxlint](https://oxc.rs/) for linting
- Deployed to [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [Wrangler](https://developers.cloudflare.com/workers/wrangler/), with a GitHub Actions workflow that deploys on push to `master`

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Build and preview via `wrangler dev` |
| `npm run deploy` | Build and deploy to Cloudflare Workers |

## Project structure

```
src/
  components/   UI panels (race/deity/background pickers, level planner, feat/skill trackers, guidance, ...)
  data/         Static ruleset data (classes, races, templates, feats, skills, deities, prestige/feat prerequisites)
  lib/          Build calculation and rules engine (totals per level, prereq checks, import/export)
  types.ts      Shared Build/character types
```

## Disclaimer

This is a fan-made, unofficial tool and is not affiliated with or endorsed by the Prisoners of the Mist server team. Ruleset data is maintained by hand and may drift from the live server — always double-check important build decisions in-game.
