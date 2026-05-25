/**
 * Goals stored as JSON at ~/antigravity/shared/goals.json.
 *
 * This is intentionally file-based (not a database): the file is tiny, the
 * write rate is human-paced, and keeping it in `shared/` means Hermes can
 * read goals directly during cron-driven work.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PATHS } from "./paths";

export type GoalStatus = "active" | "paused" | "done" | "abandoned";

export type Goal = {
  id: string;
  title: string;
  description: string;
  /** 0..1 */
  progress: number;
  /** ISO date (YYYY-MM-DD) or null */
  targetDate: string | null;
  status: GoalStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type GoalsFile = {
  schema_version: number;
  updated_at: string;
  goals: Goal[];
};

async function ensureDir(): Promise<void> {
  await mkdir(path.dirname(PATHS.shared.goals), { recursive: true });
}

async function readAll(): Promise<GoalsFile> {
  try {
    const raw = await readFile(PATHS.shared.goals, "utf8");
    const data = JSON.parse(raw) as Partial<GoalsFile>;
    const goals = Array.isArray(data.goals) ? data.goals : [];
    // Migrate older flat schemas (schema_version 1 had no detailed goal fields).
    const normalized = goals.map((g): Goal => ({
      id: g.id ?? randomUUID(),
      title: g.title ?? "",
      description: typeof g.description === "string" ? g.description : "",
      progress: typeof g.progress === "number" ? clamp01(g.progress) : 0,
      targetDate: typeof g.targetDate === "string" ? g.targetDate : null,
      status:
        g.status === "paused" ||
        g.status === "done" ||
        g.status === "abandoned"
          ? g.status
          : "active",
      tags: Array.isArray(g.tags) ? g.tags.filter((t) => typeof t === "string") : [],
      createdAt:
        typeof g.createdAt === "string" ? g.createdAt : new Date().toISOString(),
      updatedAt:
        typeof g.updatedAt === "string" ? g.updatedAt : new Date().toISOString(),
    }));
    return {
      schema_version: 2,
      updated_at: data.updated_at ?? new Date().toISOString(),
      goals: normalized,
    };
  } catch {
    return {
      schema_version: 2,
      updated_at: new Date().toISOString(),
      goals: [],
    };
  }
}

async function writeAll(file: GoalsFile): Promise<void> {
  await ensureDir();
  file.updated_at = new Date().toISOString();
  await writeFile(PATHS.shared.goals, JSON.stringify(file, null, 2));
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

const STATUS_ORDER: Record<GoalStatus, number> = {
  active: 0,
  paused: 1,
  done: 2,
  abandoned: 3,
};

export async function listGoals(): Promise<Goal[]> {
  const file = await readAll();
  return file.goals.slice().sort((a, b) => {
    const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (so !== 0) return so;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function createGoal(input: {
  title: string;
  description?: string;
  targetDate?: string | null;
  tags?: string[];
  progress?: number;
}): Promise<Goal> {
  const title = input.title.trim();
  if (!title) throw new Error("title is required");
  const now = new Date().toISOString();
  const goal: Goal = {
    id: randomUUID(),
    title,
    description: input.description?.trim() ?? "",
    progress: clamp01(input.progress ?? 0),
    targetDate: input.targetDate?.trim() || null,
    status: "active",
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  const file = await readAll();
  file.goals.push(goal);
  await writeAll(file);
  return goal;
}

export async function updateGoal(
  id: string,
  patch: Partial<Pick<Goal, "title" | "description" | "progress" | "targetDate" | "status" | "tags">>
): Promise<Goal | null> {
  const file = await readAll();
  const idx = file.goals.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  const existing = file.goals[idx];
  const next: Goal = {
    ...existing,
    title: patch.title?.trim() ?? existing.title,
    description: patch.description?.trim() ?? existing.description,
    progress:
      typeof patch.progress === "number" ? clamp01(patch.progress) : existing.progress,
    targetDate:
      patch.targetDate === undefined
        ? existing.targetDate
        : (patch.targetDate?.trim() || null),
    status: patch.status ?? existing.status,
    tags: patch.tags ?? existing.tags,
    updatedAt: new Date().toISOString(),
  };
  file.goals[idx] = next;
  await writeAll(file);
  return next;
}

export async function deleteGoal(id: string): Promise<boolean> {
  const file = await readAll();
  const before = file.goals.length;
  file.goals = file.goals.filter((g) => g.id !== id);
  if (file.goals.length === before) return false;
  await writeAll(file);
  return true;
}
