/**
 * Detached spawn + lifecycle for ralph.sh runs.
 *
 * Each Ralph-enabled goal has its own working directory under
 *   ~/antigravity/ralphs/<slug>/
 * where <slug> is the parent dir name of the goal's prdPath. Ralph expects
 * `ralph.sh`, `CLAUDE.md` (or `prompt.md`) and `prd.json` to be siblings, so
 * on first run we copy `ralph.sh` + `CLAUDE.md` from the canonical clone at
 * ~/code/ralph into the goal's directory.
 *
 * Concurrency model:
 *   - per-goal lockfile at <slug>/.ralph.lock prevents a second run on the
 *     same PRD
 *   - global lockfile at ~/antigravity/ralphs/.ralph-global.lock prevents
 *     more than one Ralph loop machine-wide (avoids two parallel claude-code
 *     children fighting for the same Pro quota)
 *
 * The "hermes" runner mode runs `ralph.sh --tool claude` (Ralph itself
 * doesn't speak Hermes) AND fires a Telegram notification on start so you
 * see the loop kicking off on your phone.
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, stat, unlink, copyFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getRawSecret } from "./providers";
import type { GoalModel } from "./goals-types";

const HOME = os.homedir();
const RALPHS_ROOT = path.join(HOME, "antigravity/ralphs");
const RALPH_SRC = path.join(HOME, "code/ralph");
const GLOBAL_LOCK = path.join(RALPHS_ROOT, ".ralph-global.lock");

export type LockState = {
  pid: number;
  startedAt: string;
  goalId: string;
  model: GoalModel;
  toolFlag: string;
  maxIterations: number;
};

export type RunResult =
  | { ok: true; pid: number; startedAt: string; logPath: string }
  | { ok: false; error: string; status?: number };

export type RalphRunState = {
  state: "idle" | "running";
  pid?: number;
  startedAt?: string;
  runForSeconds?: number;
  model?: GoalModel;
  toolFlag?: string;
  maxIterations?: number;
  logPath: string;
  logTail: string;
  /** Most recent ralph.sh exit code, if a previous run completed. */
  lastExitCode: number | null;
  lastFinishedAt: string | null;
};

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function slugFromPrdPath(prdPath: string): string | null {
  const resolved = path.resolve(prdPath);
  const dir = path.dirname(resolved);
  // Must live under ~/antigravity/ralphs/<slug>/
  const expectedPrefix = RALPHS_ROOT + path.sep;
  if (!dir.startsWith(expectedPrefix)) return null;
  const slug = path.basename(dir);
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(slug)) return null;
  return slug;
}

function pathsFor(slug: string) {
  const root = path.join(RALPHS_ROOT, slug);
  return {
    root,
    ralphSh: path.join(root, "ralph.sh"),
    claudeMd: path.join(root, "CLAUDE.md"),
    promptMd: path.join(root, "prompt.md"),
    prd: path.join(root, "prd.json"),
    lock: path.join(root, ".ralph.lock"),
    log: path.join(root, "ralph.log"),
    finished: path.join(root, ".ralph.finished"),
  };
}

function isPidAlive(pid: number): boolean {
  try {
    // Signal 0 just checks for existence.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readLock(lockPath: string): Promise<LockState | null> {
  try {
    const raw = await readFile(lockPath, "utf8");
    const parsed = JSON.parse(raw) as LockState;
    if (typeof parsed.pid !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Lock can be stale if the process died without cleaning up (kernel OOM,
 * SIGKILL, host reboot). Returns the lock if it's owned by a still-running
 * process; clears + returns null if not.
 */
async function readActiveLock(lockPath: string): Promise<LockState | null> {
  const lock = await readLock(lockPath);
  if (!lock) return null;
  if (isPidAlive(lock.pid)) return lock;
  try {
    await unlink(lockPath);
  } catch {
    // best effort
  }
  return null;
}

async function tailLog(logPath: string, bytes = 8192): Promise<string> {
  // Open + read only the last N bytes. Avoids reading multi-MB log files
  // into memory just to slice off a tail.
  try {
    const { open } = await import("node:fs/promises");
    const s = await stat(logPath);
    if (s.size === 0) return "";
    const readSize = Math.min(bytes, s.size);
    const start = s.size - readSize;
    const fh = await open(logPath, "r");
    try {
      const buf = Buffer.alloc(readSize);
      await fh.read(buf, 0, readSize, start);
      return buf.toString("utf8");
    } finally {
      await fh.close();
    }
  } catch {
    return "";
  }
}

async function readLastFinish(p: { finished: string }): Promise<{ exit: number | null; at: string | null }> {
  try {
    const raw = await readFile(p.finished, "utf8");
    const data = JSON.parse(raw) as { exitCode?: number; at?: string };
    return { exit: typeof data.exitCode === "number" ? data.exitCode : null, at: data.at ?? null };
  } catch {
    return { exit: null, at: null };
  }
}

/** Copy the canonical ralph.sh + CLAUDE.md into the goal's dir on first run. */
async function ensureScaffolded(slug: string): Promise<void> {
  const p = pathsFor(slug);
  await mkdir(p.root, { recursive: true });
  if (!(await fileExists(p.ralphSh))) {
    await copyFile(path.join(RALPH_SRC, "ralph.sh"), p.ralphSh);
    // Mark executable
    const { chmod } = await import("node:fs/promises");
    await chmod(p.ralphSh, 0o755);
  }
  if (!(await fileExists(p.claudeMd))) {
    const src = path.join(RALPH_SRC, "CLAUDE.md");
    if (await fileExists(src)) await copyFile(src, p.claudeMd);
  }
  if (!(await fileExists(p.promptMd))) {
    const src = path.join(RALPH_SRC, "prompt.md");
    if (await fileExists(src)) await copyFile(src, p.promptMd);
  }
}

async function notifyTelegram(text: string): Promise<void> {
  const token = await getRawSecret("TELEGRAM_BOT_TOKEN");
  const allowed = await getRawSecret("TELEGRAM_ALLOWED_USERS");
  if (!token || !allowed) return;
  const chatId = allowed.split(",")[0]?.trim();
  if (!chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(4_000),
    });
  } catch {
    // best effort — notification failures don't block the run
  }
}

function envForSpawn(): NodeJS.ProcessEnv {
  // Mirror the cleanEnv logic from lib/antigravity.ts — IDE-injected vars
  // poison child claude/codex processes.
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined) continue;
    if (k === "ELECTRON_RUN_AS_NODE") continue;
    if (k.startsWith("VSCODE_")) continue;
    if (k === "CHROME_DESKTOP") continue;
    if (k === "NoDefaultCurrentDirectoryInExePath") continue;
    cleaned[k] = v;
  }
  return cleaned as NodeJS.ProcessEnv;
}

function ralphToolFlag(model: GoalModel): string | { error: string } {
  switch (model) {
    case "hermes": // hermes "runner" still uses claude under the hood; the difference is the Telegram supervisor wrapper
    case "claude":
      return "claude";
    case "amp":
      return "amp";
    case "antigravity":
      return { error: "antigravity runner not yet wired (Phase C)" };
  }
}

export type RunOptions = {
  goalId: string;
  prdPath: string;
  model: GoalModel;
  goalTitle: string;
  maxIterations?: number;
};

export async function startRalphRun(opts: RunOptions): Promise<RunResult> {
  const slug = slugFromPrdPath(opts.prdPath);
  if (!slug) {
    return {
      ok: false,
      status: 400,
      error: `prdPath must live under ${RALPHS_ROOT}/<slug>/prd.json`,
    };
  }
  const p = pathsFor(slug);
  if (!(await fileExists(p.prd))) {
    return { ok: false, status: 400, error: `prd.json missing at ${p.prd}` };
  }

  // Resolve tool flag from model
  const toolOrErr = ralphToolFlag(opts.model);
  if (typeof toolOrErr !== "string") {
    return { ok: false, status: 400, error: toolOrErr.error };
  }
  const toolFlag = toolOrErr;
  const maxIterations = opts.maxIterations ?? 20;

  // Per-goal lock
  const existing = await readActiveLock(p.lock);
  if (existing) {
    return {
      ok: false,
      status: 409,
      error: `already running for this goal (pid ${existing.pid} since ${existing.startedAt})`,
    };
  }
  // Global lock
  const global = await readActiveLock(GLOBAL_LOCK);
  if (global) {
    return {
      ok: false,
      status: 409,
      error: `another Ralph run is active machine-wide (goal ${global.goalId.slice(0, 8)}, pid ${global.pid}). Stop it first.`,
    };
  }

  await ensureScaffolded(slug);

  // Verify ralph.sh exists in the goal's dir
  if (!(await fileExists(p.ralphSh))) {
    return {
      ok: false,
      status: 500,
      error: `ralph.sh missing at ${p.ralphSh} — is ~/code/ralph cloned?`,
    };
  }

  // Truncate previous log + finish marker
  await writeFile(p.log, "");
  try { await unlink(p.finished); } catch { /* ok */ }

  // Spawn detached so the process outlives the HTTP request lifecycle.
  // Stream output to the log file via shell redirection so we get a real
  // unbuffered tail. We use bash -c so we can chain the exit-code write.
  const cmd = [
    `./ralph.sh --tool ${toolFlag} ${maxIterations}`,
    `STATUS=$?`,
    `echo "{\\"exitCode\\":$STATUS,\\"at\\":\\"$(date -u -Iseconds)\\"}" > .ralph.finished`,
    `rm -f .ralph.lock`,
  ].join("\n");

  const child = spawn(
    "bash",
    ["-c", `exec >>"${p.log}" 2>&1; ${cmd}`],
    {
      cwd: p.root,
      env: envForSpawn(),
      stdio: ["ignore", "ignore", "ignore"],
      detached: true,
    }
  );
  child.unref();
  const pid = child.pid;
  if (!pid) {
    return { ok: false, status: 500, error: "spawn failed (no pid)" };
  }

  const startedAt = new Date().toISOString();
  const lockState: LockState = {
    pid,
    startedAt,
    goalId: opts.goalId,
    model: opts.model,
    toolFlag,
    maxIterations,
  };

  // Write both locks
  await writeFile(p.lock, JSON.stringify(lockState, null, 2));
  await writeFile(GLOBAL_LOCK, JSON.stringify(lockState, null, 2));

  if (opts.model === "hermes") {
    await notifyTelegram(
      `🤖 *Ralph started* on *${opts.goalTitle}*\n` +
        `runner: ${opts.model} → claude\n` +
        `max iter: ${maxIterations}\n` +
        `slug: \`${slug}\``
    );
  }

  return { ok: true, pid, startedAt, logPath: p.log };
}

export async function getRalphStatus(prdPath: string): Promise<RalphRunState> {
  const slug = slugFromPrdPath(prdPath);
  if (!slug) {
    return {
      state: "idle",
      logPath: "",
      logTail: "",
      lastExitCode: null,
      lastFinishedAt: null,
    };
  }
  const p = pathsFor(slug);
  const lock = await readActiveLock(p.lock);
  const logTail = await tailLog(p.log);
  const finished = await readLastFinish(p);

  if (!lock) {
    return {
      state: "idle",
      logPath: p.log,
      logTail,
      lastExitCode: finished.exit,
      lastFinishedAt: finished.at,
    };
  }
  const startedAtMs = new Date(lock.startedAt).getTime();
  return {
    state: "running",
    pid: lock.pid,
    startedAt: lock.startedAt,
    runForSeconds: Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)),
    model: lock.model,
    toolFlag: lock.toolFlag,
    maxIterations: lock.maxIterations,
    logPath: p.log,
    logTail,
    lastExitCode: finished.exit,
    lastFinishedAt: finished.at,
  };
}

export async function stopRalphRun(prdPath: string): Promise<{ ok: boolean; error?: string }> {
  const slug = slugFromPrdPath(prdPath);
  if (!slug) return { ok: false, error: "invalid prdPath" };
  const p = pathsFor(slug);
  const lock = await readActiveLock(p.lock);
  if (!lock) return { ok: false, error: "no active run" };
  try {
    // Kill the process group (ralph.sh + spawned bash + children)
    process.kill(-lock.pid, "SIGTERM");
  } catch {
    try {
      process.kill(lock.pid, "SIGTERM");
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "kill failed",
      };
    }
  }
  // Clear locks (ralph.sh's trap may also do this, but be defensive)
  try { await unlink(p.lock); } catch { /* ok */ }
  try { await unlink(GLOBAL_LOCK); } catch { /* ok */ }
  if (lock.model === "hermes") {
    await notifyTelegram(`🛑 *Ralph stopped* manually (pid ${lock.pid}).`);
  }
  return { ok: true };
}
