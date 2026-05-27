/**
 * Ralph prd.json reader.
 *
 * Ralph's prd.json schema (https://github.com/snarktank/ralph):
 *
 *   {
 *     "project": "MyApp",
 *     "branchName": "ralph/...",
 *     "description": "...",
 *     "userStories": [
 *       {
 *         "id": "US-001",
 *         "title": "...",
 *         "description": "...",
 *         "acceptanceCriteria": ["..."],
 *         "priority": 1,
 *         "passes": false,
 *         "notes": ""
 *       }
 *     ]
 *   }
 *
 * The `passes` boolean per user story is the truth source for completion.
 * `progress = sum(passes) / userStories.length`.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();

export type RalphUserStory = {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: number;
  passes: boolean;
  notes: string;
};

export type RalphPrd = {
  filePath: string;
  modifiedAt: string;
  project: string;
  branchName: string;
  description: string;
  userStories: RalphUserStory[];
  /** sum(passes:true) */
  passingCount: number;
  /** userStories.length */
  totalCount: number;
  /** 0..1 */
  progress: number;
};

type RawStory = {
  id?: string;
  title?: string;
  description?: string;
  acceptanceCriteria?: unknown[];
  priority?: number;
  passes?: boolean;
  notes?: string;
};

type RawPrd = {
  project?: string;
  branchName?: string;
  description?: string;
  userStories?: RawStory[];
};

/**
 * Validate + read a prd.json.
 * Security: refuses paths outside $HOME to limit the blast radius of a
 * mis-typed prdPath. Returns null if the file doesn't exist or is malformed.
 */
export async function readPrd(prdPath: string): Promise<RalphPrd | null> {
  if (!prdPath) return null;
  const resolved = path.resolve(prdPath);
  if (!resolved.startsWith(HOME + path.sep) && resolved !== HOME) return null;
  if (!resolved.toLowerCase().endsWith(".json")) return null;

  let raw: string;
  let s: { mtime: Date };
  try {
    [raw, s] = await Promise.all([readFile(resolved, "utf8"), stat(resolved)]);
  } catch {
    return null;
  }

  let data: RawPrd;
  try {
    data = JSON.parse(raw) as RawPrd;
  } catch {
    return null;
  }

  const storiesIn: RawStory[] = Array.isArray(data.userStories) ? data.userStories : [];
  const userStories: RalphUserStory[] = storiesIn.map((s, i) => ({
    id: typeof s.id === "string" ? s.id : `US-${String(i + 1).padStart(3, "0")}`,
    title: typeof s.title === "string" ? s.title : "(untitled)",
    description: typeof s.description === "string" ? s.description : "",
    acceptanceCriteria: Array.isArray(s.acceptanceCriteria)
      ? s.acceptanceCriteria.filter((x): x is string => typeof x === "string")
      : [],
    priority: typeof s.priority === "number" ? s.priority : 99,
    passes: Boolean(s.passes),
    notes: typeof s.notes === "string" ? s.notes : "",
  }));

  const passingCount = userStories.filter((u) => u.passes).length;
  const totalCount = userStories.length;
  const progress = totalCount === 0 ? 0 : passingCount / totalCount;

  return {
    filePath: resolved,
    modifiedAt: s.mtime.toISOString(),
    project: typeof data.project === "string" ? data.project : "",
    branchName: typeof data.branchName === "string" ? data.branchName : "",
    description: typeof data.description === "string" ? data.description : "",
    userStories,
    passingCount,
    totalCount,
    progress,
  };
}
