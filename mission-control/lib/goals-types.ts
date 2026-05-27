/**
 * Goal types + constants ONLY. No filesystem I/O.
 *
 * Client components must import types/values from here, not from
 * `lib/goals.ts` — that module uses `node:fs/promises` and would drag the
 * entire fs module into the browser bundle if imported as a value.
 */

export type GoalStatus = "active" | "paused" | "done" | "abandoned";

/**
 * Which agent / tool spawns Ralph loops for this goal.
 * - `hermes`: Hermes orchestrates `ralph.sh` and reports progress to Telegram + activity log (default supervisor)
 * - `claude`: direct `ralph.sh --tool claude` (fast, uses Claude Pro quota)
 * - `amp`: direct `ralph.sh --tool amp` (separate billing)
 * - `antigravity`: agy-driven loop (custom wrapper, not yet plumbed)
 */
export type GoalModel = "hermes" | "claude" | "amp" | "antigravity";

export const GOAL_MODELS: GoalModel[] = ["hermes", "claude", "amp", "antigravity"];

export type Goal = {
  id: string;
  title: string;
  description: string;
  /** 0..1. Manual when no prd_path; derived from PRD passes when set. */
  progress: number;
  /** ISO date (YYYY-MM-DD) or null */
  targetDate: string | null;
  status: GoalStatus;
  tags: string[];
  /** Optional path to a Ralph prd.json. When set the dashboard renders the
   * user-story checklist and derives progress from `passes:true` counts. */
  prdPath: string | null;
  /** Which agent spawns Ralph loops. Defaults to "hermes". */
  model: GoalModel;
  createdAt: string;
  updatedAt: string;
};
