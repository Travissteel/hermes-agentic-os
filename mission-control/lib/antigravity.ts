/**
 * Google Antigravity CLI (`agy`) detection.
 *
 * Auth check is intentionally cheap: we don't invoke `agy -p` because real
 * print-mode calls take ~30 seconds (round-trip to Gemini) and burn quota.
 * Instead we check for the implicit-OAuth token file the CLI writes after
 * a successful sign-in.
 */
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { stat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const execAsync = promisify(exec);

const HOME = os.homedir();
const AGY_BIN = path.join(HOME, ".local/bin/agy");
const CONFIG_DIR = path.join(HOME, ".gemini/antigravity-cli");
const IMPLICIT_DIR = path.join(CONFIG_DIR, "implicit");
const CLI_LOG = path.join(CONFIG_DIR, "cli.log");
const CONVERSATIONS_DIR = path.join(CONFIG_DIR, "conversations");
const LAST_CONVOS_FILE = path.join(CONFIG_DIR, "cache/last_conversations.json");
const AGY_WORKDIR = path.join(HOME, "antigravity");

export type AntigravityInfo = {
  installed: boolean;
  version: string | null;
  authStatus: "signed-in" | "missing" | "unknown";
  tokenAgeMinutes: number | null;
  defaultModel: string;
  lastCliActivityAt: string | null;
  binaryPath: string;
  configDir: string;
};

export type AntigravityConversation = {
  id: string;
  modifiedAt: string;
  sizeBytes: number;
  /** True if this is the current conversation for the antigravity workspace. */
  isCurrent: boolean;
};

export type AgyPrintResult = {
  ok: boolean;
  response: string;
  durationMs: number;
  exitCode: number | null;
  error?: string;
};

const DEFAULT_MODEL = "Gemini 3.5 Flash (Medium)";

/**
 * Strip env vars that signal "we're inside the Antigravity IDE / VS Code Electron
 * extension host." When Next.js dev server runs from the IDE's integrated terminal,
 * these vars leak in, and child `agy` processes then fail token discovery with
 * "You are not logged into Antigravity." Sanitising restores normal CLI behaviour.
 */
function cleanEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) continue;
    // Strip Electron + VS Code extension-host markers
    if (k === "ELECTRON_RUN_AS_NODE") continue;
    if (k.startsWith("VSCODE_")) continue;
    if (k === "CHROME_DESKTOP") continue;
    if (k === "NoDefaultCurrentDirectoryInExePath") continue;
    cleaned[k] = v;
  }
  return cleaned;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function getNewestTokenAgeMinutes(): Promise<number | null> {
  try {
    const entries = await readdir(IMPLICIT_DIR);
    if (entries.length === 0) return null;
    let newest = 0;
    for (const e of entries) {
      const s = await stat(path.join(IMPLICIT_DIR, e));
      if (s.mtime.getTime() > newest) newest = s.mtime.getTime();
    }
    if (!newest) return null;
    return Math.round((Date.now() - newest) / 60_000);
  } catch {
    return null;
  }
}

async function getLastCliActivityAt(): Promise<string | null> {
  try {
    const s = await stat(CLI_LOG);
    return s.mtime.toISOString();
  } catch {
    return null;
  }
}

async function getVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`${AGY_BIN} --version`, { timeout: 5_000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function getAntigravityInfo(): Promise<AntigravityInfo> {
  const installed = await fileExists(AGY_BIN);
  if (!installed) {
    return {
      installed: false,
      version: null,
      authStatus: "missing",
      tokenAgeMinutes: null,
      defaultModel: DEFAULT_MODEL,
      lastCliActivityAt: null,
      binaryPath: AGY_BIN,
      configDir: CONFIG_DIR,
    };
  }

  const [version, tokenAgeMinutes, lastCliActivityAt] = await Promise.all([
    getVersion(),
    getNewestTokenAgeMinutes(),
    getLastCliActivityAt(),
  ]);

  const authStatus: AntigravityInfo["authStatus"] =
    tokenAgeMinutes === null ? "missing" : "signed-in";

  return {
    installed: true,
    version,
    authStatus,
    tokenAgeMinutes,
    defaultModel: DEFAULT_MODEL,
    lastCliActivityAt,
    binaryPath: AGY_BIN,
    configDir: CONFIG_DIR,
  };
}

export async function getConversations(): Promise<AntigravityConversation[]> {
  let currentId: string | null = null;
  try {
    const raw = await readFile(LAST_CONVOS_FILE, "utf8");
    const map = JSON.parse(raw) as Record<string, string>;
    currentId = map[AGY_WORKDIR] ?? null;
  } catch {
    // no recent-convos cache yet
  }

  try {
    const files = await readdir(CONVERSATIONS_DIR);
    const rows = await Promise.all(
      files
        .filter((f) => f.endsWith(".pb"))
        .map(async (f) => {
          const id = f.replace(/\.pb$/, "");
          const s = await stat(path.join(CONVERSATIONS_DIR, f));
          return {
            id,
            modifiedAt: s.mtime.toISOString(),
            sizeBytes: s.size,
            isCurrent: id === currentId,
          };
        })
    );
    return rows.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  } catch {
    return [];
  }
}

export type PrintOptions = {
  continue?: boolean;
  conversation?: string;
  skipPermissions?: boolean;
  timeoutMs?: number;
};

export async function runAgyPrint(
  prompt: string,
  opts: PrintOptions = {}
): Promise<AgyPrintResult> {
  const args = ["-p", prompt];
  if (opts.continue) args.push("--continue");
  if (opts.conversation) args.push("--conversation", opts.conversation);
  if (opts.skipPermissions) args.push("--dangerously-skip-permissions");
  // agy's own timeout slightly shorter than the wrapper's so we get a clean stderr message.
  const agyTimeoutSec = Math.floor((opts.timeoutMs ?? 5 * 60_000) / 1000) - 5;
  args.push("--print-timeout", `${Math.max(agyTimeoutSec, 30)}s`);

  const start = Date.now();
  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(AGY_BIN, args, {
      cwd: AGY_WORKDIR,
      // Cast: cleanEnv returns Record<string,string> which is a structural
      // subset of NodeJS.ProcessEnv (where NODE_ENV is just typed as a
      // particular string). spawn accepts any object with string values.
      env: cleanEnv(process.env) as NodeJS.ProcessEnv,
      // Close stdin: agy -p takes the prompt as argv, doesn't need stdin.
      // Leaving stdin as a pipe causes the process to hang waiting for EOF.
      stdio: ["ignore", "pipe", "pipe"],
    });
    const killTimer = setTimeout(
      () => child.kill("SIGTERM"),
      opts.timeoutMs ?? 5 * 60_000
    );
    child.stdout.on("data", (b: Buffer) => (stdout += b.toString()));
    child.stderr.on("data", (b: Buffer) => (stderr += b.toString()));
    child.on("close", (code: number | null) => {
      clearTimeout(killTimer);
      const durationMs = Date.now() - start;
      if (code === 0) {
        resolve({
          ok: true,
          response: stdout.trim(),
          durationMs,
          exitCode: code,
        });
      } else {
        resolve({
          ok: false,
          response: stdout.trim(),
          durationMs,
          exitCode: code,
          error: stderr.trim() || `agy exited with code ${code}`,
        });
      }
    });
    child.on("error", (e: Error) => {
      clearTimeout(killTimer);
      resolve({
        ok: false,
        response: "",
        durationMs: Date.now() - start,
        exitCode: null,
        error: e.message,
      });
    });
  });
}
