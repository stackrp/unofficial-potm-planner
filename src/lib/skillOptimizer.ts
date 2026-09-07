import { ALL_SKILLS, type SkillStatus } from "../data/skills";
import type { LevelEntry, SkillAllocation } from "../types";
import type { LevelSnapshot } from "./calculator";
import { skillMaxRank, skillStatusForClass } from "./skillRules";

export type SkillPriority = "primary" | "secondary";

/**
 * How aggressively the plan may bank skill points for a later, cheaper/better level.
 *  - "eager"    – buy ranks as you level; almost no banking. Skills come online early, but a
 *                 skill that's only a class skill for a few late levels can lose out.
 *  - "balanced" – bank a moderate amount (the default).
 *  - "max"      – bank without limit to reach the highest possible final ranks, even if that
 *                 means levelling with points saved up and some skills sitting low for a while.
 */
export type GreedMode = "eager" | "balanced" | "max";

export interface SkillOptimizerOptions {
  levels: LevelEntry[];
  perLevel: LevelSnapshot[];
  /** Selection order matters within each priority group: earlier entries are funded first
   * (and to the highest rank) when the budget can't cover everything. */
  primarySkills: string[];
  secondarySkills: string[];
  /** Once selected skills are funded, spend leftover points on other class skills too instead
   * of leaving them banked at the end of the build. */
  dumpLeftover: boolean;
  /** Optional per-skill rank cap (skillName -> desired rank). Clamped to the skill's natural
   * best-achievable rank. Skills without an entry are targeted at their natural max. */
  caps?: Record<string, number>;
  /** Banking aggressiveness. Defaults to "balanced". */
  greed?: GreedMode;
  /** Hard "need N ranks by character level L" checkpoints (skillName -> [{ byLevel, ranks }]),
   * from feat / prestige prerequisites the build commits to. The optimizer funds these ranks
   * before merely-wanted skills and pushes their purchases to land at or before `byLevel`. A
   * skill named here is planned even if it isn't in primary/secondary. */
  deadlines?: Record<string, { byLevel: number; ranks: number }[]>;
}

export interface SkillOptimizerSkillResult {
  skillName: string;
  priority: SkillPriority;
  /** Best rank this skill could ever reach in this build, by the final level. */
  target: number;
  achieved: number;
  fullyFunded: boolean;
}

export interface SkillDeadlineResult {
  skillName: string;
  byLevel: number;
  /** Ranks the prerequisite needs by `byLevel`. */
  ranks: number;
  /** Ranks the plan actually has by `byLevel`. */
  achieved: number;
  met: boolean;
}

export interface SkillOptimizerResult {
  allocations: SkillAllocation[];
  perSkill: SkillOptimizerSkillResult[];
  /** One row per feat/prestige rank checkpoint the plan was asked to hit. */
  deadlineResults: SkillDeadlineResult[];
  totalAvailable: number;
  totalSpent: number;
  endBanked: number;
  /** Highest running unspent balance at any point in the plan — how much the plan asks you to
   * sit on. Lets the UI show what a greedier mode costs in playability. */
  peakBanked: number;
}

const UNBOUNDED = Number.MAX_SAFE_INTEGER;

// Per-rank pull for a wanted skill. Must dwarf the largest possible earliness cost on a path
// (bounded by the number of levels), so funding a rank always beats buying it one level sooner.
const FUND_REWARD = 1_000_000;

// Added to a class-rate purchase's cost for every deadline it lands *after*, so the min-cost
// solver spends a skill's early ranks on levels at or before its checkpoints. Well below
// FUND_REWARD (a rank the plan can only buy late is still worth buying), well above any path's
// earliness cost, and capped in use so several deadlines can't stack past FUND_REWARD.
const LATE_PENALTY = 50_000;

// "eager" / "balanced" carry limits, as a fraction of one level's average skill points.
const EAGER_BANK_FRACTION = 0.35;
const BALANCED_BANK_FRACTION = 0.7;

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Min-cost max-flow (SPFA shortest-augmenting-path). Integer costs only.
// ---------------------------------------------------------------------------
class MinCostFlow {
  private readonly n: number;
  private readonly head: number[];
  private readonly to: number[] = [];
  private readonly nextEdge: number[] = [];
  private readonly cap: number[] = [];
  private readonly cost: number[] = [];

  constructor(n: number) {
    this.n = n;
    this.head = new Array(n).fill(-1);
  }

  /** Adds `u -> v` (with its reverse residual edge) and returns the forward edge's id. */
  addEdge(u: number, v: number, cap: number, cost: number): number {
    const forward = this.push(u, v, cap, cost);
    this.push(v, u, 0, -cost);
    return forward;
  }

  private push(from: number, to: number, cap: number, cost: number): number {
    const id = this.to.length;
    this.to.push(to);
    this.cap.push(cap);
    this.cost.push(cost);
    this.nextEdge.push(this.head[from]);
    this.head[from] = id;
    return id;
  }

  setCap(edgeId: number, cap: number): void {
    this.cap[edgeId] = cap;
  }

  setCost(edgeId: number, cost: number): void {
    this.cost[edgeId] = cost;
    this.cost[edgeId + 1] = -cost;
  }

  /** Flow currently pushed through `edgeId` (== the reverse edge's residual capacity). */
  flowOf(edgeId: number): number {
    return this.cap[edgeId + 1];
  }

  /** Pin an edge at its current flow: no more can go through it and none can be pulled back. */
  lock(edgeId: number): void {
    this.cap[edgeId] = 0;
    this.cap[edgeId + 1] = 0;
  }

  /** Push flow along negative-cost augmenting paths until none remain. */
  run(s: number, t: number): void {
    for (;;) {
      const { dist, prevEdge } = this.shortestPaths(s);
      if (dist[t] === UNBOUNDED || dist[t] >= 0) break; // no further profitable path

      let bottleneck = UNBOUNDED;
      for (let v = t; v !== s; v = this.to[prevEdge[v] ^ 1]) {
        bottleneck = Math.min(bottleneck, this.cap[prevEdge[v]]);
      }
      for (let v = t; v !== s; v = this.to[prevEdge[v] ^ 1]) {
        this.cap[prevEdge[v]] -= bottleneck;
        this.cap[prevEdge[v] ^ 1] += bottleneck;
      }
    }
  }

  private shortestPaths(s: number): { dist: number[]; prevEdge: number[] } {
    const dist = new Array<number>(this.n).fill(UNBOUNDED);
    const inQueue = new Array<boolean>(this.n).fill(false);
    const prevEdge = new Array<number>(this.n).fill(-1);
    dist[s] = 0;
    const queue: number[] = [s];
    while (queue.length > 0) {
      const u = queue.shift()!;
      inQueue[u] = false;
      for (let e = this.head[u]; e !== -1; e = this.nextEdge[e]) {
        if (this.cap[e] <= 0) continue;
        const v = this.to[e];
        const relaxed = dist[u] + this.cost[e];
        if (relaxed < dist[v]) {
          dist[v] = relaxed;
          prevEdge[v] = e;
          if (!inQueue[v]) {
            inQueue[v] = true;
            queue.push(v);
          }
        }
      }
    }
    return { dist, prevEdge };
  }
}

function bankCapFor(greed: GreedMode, points: number[]): number {
  if (greed === "max") return UNBOUNDED;
  const avgPerLevel = sum(points) / Math.max(1, points.length);
  const fraction = greed === "eager" ? EAGER_BANK_FRACTION : BALANCED_BANK_FRACTION;
  return Math.max(1, Math.round(avgPerLevel * fraction));
}

/** Everything the two solver passes need, derived once from the options. */
interface PlanContext {
  levels: LevelEntry[];
  /** Number of levels; level i (0-based) is `levels[i]`. */
  n: number;
  /** Skill points gained at each level. */
  points: number[];
  /** Most points the plan may carry from one level to the next. */
  bankCap: number;
  /** Chosen skills, primaries then secondaries, in funding-priority order. */
  selected: string[];
  priorityOf: Record<string, SkillPriority>;
  /** Rank this skill is aimed at (its natural max, or the user's cap). */
  target: (skillName: string) => number;
  /** Cumulative rank ceiling for a skill through level `i` (the level+3 rule, credited only at
   * levels the skill was actually a class skill — see `skillMaxRank`). */
  rankCeiling: (skillName: string, i: number) => number;
  status: (skillName: string, i: number) => SkillStatus;
  /** Feat/prestige rank checkpoints for a skill, sorted by `byLevel`. Empty for most skills. */
  deadlinesOf: (skillName: string) => { byLevel: number; ranks: number }[];
}

/** Cost of buying a class-rate rank of `s` at level index `i`: buy-early bias (`i`), plus a
 * penalty for each of the skill's deadlines this level falls after. */
function classEntryCost(ctx: PlanContext, s: string, i: number): number {
  const charLevel = ctx.levels[i].level;
  let late = 0;
  for (const d of ctx.deadlinesOf(s)) if (charLevel > d.byLevel) late++;
  return i + Math.min(late, 9) * LATE_PENALTY;
}

interface ClassRateSolution {
  /** Ranks bought at class rate: `classBought[skill][levelIndex]`. */
  classBought: Record<string, number[]>;
  /** Per level: income the flow didn't draw. */
  unspentIncome: number[];
  /** Per level `i`: bank room from `i` to `i+1` the flow didn't use. */
  freeBankRoom: number[];
}

/**
 * Buy each selected skill's ranks at class rate (1 pt/rank), one skill at a time in priority
 * order, on a flow network:
 *
 *   SRC --income--> BUD[level] --bank(cap)--> BUD[level+1] ...
 *   BUD[level] --(class levels only, cost = level index)--> capChain[skill][level] --> ... --> skillSink --> SINK
 *
 * The cap-chain edge out of level `i` is capped at that skill's cumulative rank ceiling, so no
 * schedule can exceed the level+3 rule. Entry-edge cost = level index, so among equally-good
 * schedules the solver buys as early as possible.
 *
 * Each skill is funded by temporarily opening its sink at a large negative cost (pull as many
 * ranks as the budget allows), then locking the sink at the achieved count. Locking freezes the
 * *count* but not the *timing*: a later skill's phase may still re-route an earlier skill's
 * purchases to different levels to make room for itself.
 */
function solveClassRateByPriority(ctx: PlanContext): ClassRateSolution {
  const { n, points, bankCap, selected } = ctx;

  const SRC = 0;
  const budNode = (i: number) => 1 + i;
  let nextId = 1 + n;
  const capNode: Record<string, number[]> = {};
  for (const s of selected) capNode[s] = Array.from({ length: n }, () => nextId++);
  const sinkNode: Record<string, number> = {};
  for (const s of selected) sinkNode[s] = nextId++;
  const SINK = nextId++;

  const mcf = new MinCostFlow(nextId);
  const srcEdge = points.map((p, i) => mcf.addEdge(SRC, budNode(i), p, 0));
  const bankEdge: number[] = [];
  for (let i = 0; i < n - 1; i++) bankEdge.push(mcf.addEdge(budNode(i), budNode(i + 1), bankCap, 0));
  mcf.addEdge(budNode(n - 1), SINK, UNBOUNDED, 0); // drain for a point freed by re-timing a purchase

  const entryEdge: Record<string, Array<number | null>> = {};
  for (const s of selected) {
    entryEdge[s] = [];
    for (let i = 0; i < n; i++) {
      entryEdge[s][i] =
        ctx.status(s, i) === "class"
          ? mcf.addEdge(budNode(i), capNode[s][i], UNBOUNDED, classEntryCost(ctx, s, i))
          : null;
      const onward = i < n - 1 ? capNode[s][i + 1] : sinkNode[s];
      mcf.addEdge(capNode[s][i], onward, ctx.rankCeiling(s, i), 0);
    }
  }
  const sinkEdge: Record<string, number> = {};
  for (const s of selected) sinkEdge[s] = mcf.addEdge(sinkNode[s], SINK, 0, 0);

  for (const s of selected) {
    const target = ctx.target(s);
    if (target <= 0) continue;
    mcf.setCap(sinkEdge[s], target);
    mcf.setCost(sinkEdge[s], -FUND_REWARD);
    mcf.run(SRC, SINK);
    mcf.setCost(sinkEdge[s], 0);
    mcf.lock(sinkEdge[s]);
  }

  const classBought: Record<string, number[]> = {};
  for (const s of selected) {
    classBought[s] = entryEdge[s].map((e) => (e == null ? 0 : mcf.flowOf(e)));
  }
  return {
    classBought,
    unspentIncome: srcEdge.map((e, i) => points[i] - mcf.flowOf(e)),
    freeBankRoom: bankEdge.map((e) => bankCap - mcf.flowOf(e)),
  };
}

interface TopUp {
  /** Cross-class ranks (2 pts each) added for still-short selected skills. */
  crossBought: Record<string, number[]>;
  /** Class-rate ranks added for non-selected skills to use up leftover points. */
  dumpBought: Record<string, number[]>;
  dumpNames: string[];
}

/**
 * A greedy sweep over what {@link solveClassRateByPriority} left unspent:
 *   (a) cross-class ranks for any selected skill still short of its target, and
 *   (b) if `dumpLeftover`, class-rate ranks for other skills so points aren't wasted.
 * Only ever spends income the flow left unspent and bank room it left free, so it can't
 * undermine the class-rate plan.
 */
function topUpLeftover(ctx: PlanContext, solution: ClassRateSolution, dumpLeftover: boolean): TopUp {
  const { levels, n, selected, priorityOf } = ctx;
  const { classBought, unspentIncome, freeBankRoom } = solution;

  const crossBought: Record<string, number[]> = {};
  const dumpBought: Record<string, number[]> = {};
  const addedHere: Record<string, number> = {};
  const classTotal: Record<string, number> = {};
  // slack[skill][L] = rank headroom above what's already committed, through level L.
  const slack: Record<string, number[]> = {};

  for (const s of selected) {
    crossBought[s] = new Array(n).fill(0);
    classTotal[s] = sum(classBought[s]);
    slack[s] = new Array(n);
    let cum = 0;
    for (let i = 0; i < n; i++) {
      cum += classBought[s][i];
      slack[s][i] = ctx.rankCeiling(s, i) - cum;
    }
  }

  const dumpNames = dumpLeftover
    ? ALL_SKILLS.map((d) => d.name).filter(
        (name) => !priorityOf[name] && levels.some((_, i) => ctx.status(name, i) === "class"),
      )
    : [];
  for (const s of dumpNames) {
    dumpBought[s] = new Array(n).fill(0);
    classTotal[s] = 0;
    slack[s] = levels.map((_, i) => ctx.rankCeiling(s, i));
  }

  const minSlackFrom = (s: string, from: number) => {
    let m = Infinity;
    for (let L = from; L < n; L++) m = Math.min(m, slack[s][L]);
    return m;
  };
  const spendSlack = (s: string, from: number, ranks: number) => {
    for (let L = from; L < n; L++) slack[s][L] -= ranks;
  };
  const stillNeeded = (s: string) => ctx.target(s) - classTotal[s] - (addedHere[s] ?? 0);
  const isEverCrossClass = (s: string) => levels.some((_, i) => ctx.status(s, i) === "crossClass");

  const buy = (into: Record<string, number[]>, s: string, i: number, ranks: number) => {
    into[s][i] += ranks;
    addedHere[s] = (addedHere[s] ?? 0) + ranks;
    spendSlack(s, i, ranks);
  };

  let carry = 0;
  for (let i = 0; i < n; i++) {
    let pool = carry + unspentIncome[i];

    // (a) cross-class top-up, selected skills in priority order
    for (const s of selected) {
      if (pool < 2) break;
      if (ctx.status(s, i) !== "crossClass") continue;
      const ranks = Math.min(stillNeeded(s), minSlackFrom(s, i), Math.floor(pool / 2));
      if (ranks <= 0) continue;
      buy(crossBought, s, i, ranks);
      pool -= ranks * 2;
    }

    // (b) dump — but hold back points a still-short cross-class selected skill will need to
    //     accumulate for a later level, so the dump doesn't starve it.
    if (dumpNames.length > 0 && pool >= 1) {
      let reserved = 0;
      for (const s of selected) {
        if (stillNeeded(s) <= 0 || !isEverCrossClass(s)) continue;
        reserved += Math.min(stillNeeded(s), minSlackFrom(s, 0)) * 2;
      }
      let dumpable = Math.max(0, pool - reserved);
      for (const s of dumpNames) {
        if (dumpable < 1) break;
        if (ctx.status(s, i) !== "class") continue;
        const ranks = Math.min(stillNeeded(s), minSlackFrom(s, i), dumpable);
        if (ranks <= 0) continue;
        buy(dumpBought, s, i, ranks);
        pool -= ranks;
        dumpable -= ranks;
      }
    }

    carry = i < n - 1 ? Math.min(freeBankRoom[i], Math.max(0, pool)) : 0;
  }

  return { crossBought, dumpBought, dumpNames };
}

export function optimizeSkills(opts: SkillOptimizerOptions): SkillOptimizerResult {
  const { levels, perLevel, primarySkills, secondarySkills, dumpLeftover, caps } = opts;
  const greed: GreedMode = opts.greed ?? "balanced";

  if (levels.length === 0) {
    return {
      allocations: [], perSkill: [], deadlineResults: [],
      totalAvailable: 0, totalSpent: 0, endBanked: 0, peakBanked: 0,
    };
  }

  const n = levels.length;
  const points = levels.map((_, i) => perLevel[i]?.skillPointsGained ?? 0);
  const totalAvailable = sum(points);
  const finalLevel = levels[n - 1].level;

  // Normalize deadlines: keep only real, still-reachable requirements, one per (skill, byLevel).
  const deadlines: Record<string, { byLevel: number; ranks: number }[]> = {};
  for (const [skillName, list] of Object.entries(opts.deadlines ?? {})) {
    const naturalMax = skillMaxRank(skillName, levels, finalLevel);
    const perByLevel = new Map<number, number>();
    for (const { byLevel, ranks } of list) {
      const clamped = Math.min(ranks, naturalMax);
      if (clamped <= 0 || byLevel <= 0) continue;
      perByLevel.set(byLevel, Math.max(perByLevel.get(byLevel) ?? 0, clamped));
    }
    if (perByLevel.size > 0) {
      deadlines[skillName] = [...perByLevel.entries()]
        .map(([byLevel, ranks]) => ({ byLevel, ranks }))
        .sort((a, b) => a.byLevel - b.byLevel);
    }
  }

  const priorityOf: Record<string, SkillPriority> = {};
  for (const name of primarySkills) priorityOf[name] = "primary";
  for (const name of secondarySkills) priorityOf[name] = "secondary";
  // A skill with a deadline is planned whether or not the user marked it, and is funded first —
  // earliest checkpoint first — so a feat/prestige requirement outranks a nice-to-have skill.
  for (const name of Object.keys(deadlines)) priorityOf[name] ??= "primary";
  const deadlineSkills = Object.keys(deadlines).sort(
    (a, b) => deadlines[a][0].byLevel - deadlines[b][0].byLevel || a.localeCompare(b),
  );
  const selected = [
    ...deadlineSkills,
    ...primarySkills.filter((s) => !deadlines[s]),
    ...secondarySkills.filter((s) => !deadlines[s]),
  ].filter((s, i, a) => a.indexOf(s) === i);

  const ctx: PlanContext = {
    levels,
    n,
    points,
    bankCap: bankCapFor(greed, points),
    selected,
    priorityOf,
    deadlinesOf: (skillName) => deadlines[skillName] ?? [],
    target: (skillName) => {
      const naturalMax = skillMaxRank(skillName, levels, finalLevel);
      const cap = caps?.[skillName];
      return cap != null && cap >= 0 ? Math.min(cap, naturalMax) : naturalMax;
    },
    rankCeiling: (skillName, i) => skillMaxRank(skillName, levels, levels[i].level),
    status: (skillName, i) => skillStatusForClass(skillName, levels[i].className),
  };

  const solution = solveClassRateByPriority(ctx);
  const { crossBought, dumpBought, dumpNames } = topUpLeftover(ctx, solution, dumpLeftover);
  const { classBought } = solution;

  // ----- fold the three sources into per-level allocations -----
  const ranksByLevel: Record<number, Record<string, number>> = {};
  const record = (i: number, skillName: string, ranks: number) => {
    if (ranks <= 0) return;
    const lvl = levels[i].level;
    (ranksByLevel[lvl] ??= {})[skillName] = (ranksByLevel[lvl][skillName] ?? 0) + ranks;
  };
  for (const s of selected) for (let i = 0; i < n; i++) record(i, s, classBought[s][i] + crossBought[s][i]);
  for (const s of dumpNames) for (let i = 0; i < n; i++) record(i, s, dumpBought[s][i]);

  const allocations: SkillAllocation[] = [];
  for (const lvl of Object.keys(ranksByLevel).map(Number).sort((a, b) => a - b)) {
    for (const [skillName, ranks] of Object.entries(ranksByLevel[lvl])) {
      allocations.push({ level: lvl, skillName, ranks });
    }
  }

  const achievedOf = (s: string) => sum(classBought[s]) + sum(crossBought[s] ?? []);
  const perSkill: SkillOptimizerSkillResult[] = selected.map((skillName) => {
    const target = ctx.target(skillName);
    const achieved = achievedOf(skillName);
    return { skillName, priority: priorityOf[skillName], target, achieved, fullyFunded: achieved >= target };
  });

  const deadlineResults: SkillDeadlineResult[] = Object.entries(deadlines)
    .flatMap(([skillName, list]) =>
      list.map(({ byLevel, ranks }) => {
        const achieved = allocations
          .filter((a) => a.skillName === skillName && a.level <= byLevel)
          .reduce((s, a) => s + a.ranks, 0);
        return { skillName, byLevel, ranks, achieved, met: achieved >= ranks };
      }),
    )
    .sort((a, b) => a.byLevel - b.byLevel || a.skillName.localeCompare(b.skillName));

  const spentByLevel = new Array(n).fill(0);
  for (const s of selected) for (let i = 0; i < n; i++) spentByLevel[i] += classBought[s][i] + crossBought[s][i] * 2;
  for (const s of dumpNames) for (let i = 0; i < n; i++) spentByLevel[i] += dumpBought[s][i];
  const totalSpent = sum(spentByLevel);

  // Running points you have to sit on to follow the plan (income the plan never spends is left
  // free, not counted as "banked").
  let carried = 0;
  let peakBanked = 0;
  for (let i = 0; i < n; i++) {
    carried = Math.min(ctx.bankCap, Math.max(0, carried + points[i] - spentByLevel[i]));
    peakBanked = Math.max(peakBanked, carried);
  }

  return {
    allocations,
    perSkill,
    deadlineResults,
    totalAvailable,
    totalSpent,
    endBanked: totalAvailable - totalSpent,
    peakBanked,
  };
}
