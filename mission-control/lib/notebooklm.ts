import { exec } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execAsync = promisify(exec);

const HOME = os.homedir();
const NB_HOME = path.join(HOME, ".notebooklm");
const STORAGE_STATE = path.join(NB_HOME, "storage_state.json");
const NB_CLI = path.join(HOME, ".local/bin/notebooklm");

export type NotebookSummary = {
  id: string;
  title: string;
  createdAt: string | null;
  isOwner: boolean;
  /** Convenience link to open the notebook in NotebookLM's web UI. */
  url: string;
};

export type NotebookLMInfo = {
  installed: boolean;
  authStatus: "valid" | "expired" | "missing" | "unknown";
  storageStateAgeDays: number | null;
  notebookCount: number | null;
  recentNotebooks: NotebookSummary[];
  reauthCommand: string;
  error?: string;
};

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function getNotebookLMInfo(): Promise<NotebookLMInfo> {
  const installed = await fileExists(NB_CLI);
  if (!installed) {
    return {
      installed: false,
      authStatus: "missing",
      storageStateAgeDays: null,
      notebookCount: null,
      recentNotebooks: [],
      reauthCommand: "uv tool install notebooklm-py[browser] && notebooklm login",
    };
  }

  const hasState = await fileExists(STORAGE_STATE);
  let ageDays: number | null = null;
  if (hasState) {
    const s = await stat(STORAGE_STATE);
    ageDays = Math.round((Date.now() - s.mtime.getTime()) / 86_400_000);
  }

  if (!hasState) {
    return {
      installed: true,
      authStatus: "missing",
      storageStateAgeDays: null,
      notebookCount: null,
      recentNotebooks: [],
      reauthCommand: "notebooklm login",
    };
  }

  // Attempt to list notebooks; if it fails, treat as expired.
  try {
    const { stdout, stderr } = await execAsync(`${NB_CLI} list --json`, {
      timeout: 8_000,
    });
    const text = stdout || stderr || "";
    if (/Authentication expired|Run.*login/i.test(text)) {
      return {
        installed: true,
        authStatus: "expired",
        storageStateAgeDays: ageDays,
        notebookCount: null,
        recentNotebooks: [],
        reauthCommand: "notebooklm login",
      };
    }
    try {
      const parsed = JSON.parse(text);
      type RawNotebook = {
        id?: string;
        title?: string;
        created_at?: string;
        is_owner?: boolean;
      };
      const list: RawNotebook[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { notebooks?: unknown }).notebooks)
          ? ((parsed as { notebooks: RawNotebook[] }).notebooks)
          : [];
      const sorted = list
        .slice()
        .sort((a, b) =>
          (b.created_at ?? "").localeCompare(a.created_at ?? "")
        );
      return {
        installed: true,
        authStatus: "valid",
        storageStateAgeDays: ageDays,
        notebookCount: list.length,
        recentNotebooks: sorted.slice(0, 6).map((n) => ({
          id: n.id ?? "?",
          title: n.title ?? "(untitled)",
          createdAt: n.created_at ?? null,
          isOwner: Boolean(n.is_owner),
          url: `https://notebooklm.google.com/notebook/${n.id ?? ""}`,
        })),
        reauthCommand: "notebooklm login",
      };
    } catch {
      // CLI returned non-JSON — count rows heuristically
      const rows = text
        .split("\n")
        .filter((l) => l.trim() && !/^Notebook ID|^---|^Total/.test(l));
      return {
        installed: true,
        authStatus: "valid",
        storageStateAgeDays: ageDays,
        notebookCount: rows.length,
        recentNotebooks: [],
        reauthCommand: "notebooklm login",
      };
    }
  } catch (e) {
    // execAsync's rejection error carries .stdout/.stderr separately.
    const err = e as { message?: string; stdout?: string; stderr?: string };
    const combined = [err.message, err.stdout, err.stderr]
      .filter(Boolean)
      .join("\n");
    const expired = /Authentication expired|expired or invalid|Run.*login/i.test(combined);
    return {
      installed: true,
      authStatus: expired ? "expired" : "unknown",
      storageStateAgeDays: ageDays,
      notebookCount: null,
      recentNotebooks: [],
      reauthCommand: "notebooklm login",
      error: expired ? undefined : combined.slice(0, 200),
    };
  }
}

export async function readStorageStateMeta(): Promise<{ exists: boolean; ageDays: number | null }> {
  if (!(await fileExists(STORAGE_STATE))) return { exists: false, ageDays: null };
  const s = await stat(STORAGE_STATE);
  return {
    exists: true,
    ageDays: Math.round((Date.now() - s.mtime.getTime()) / 86_400_000),
  };
}
