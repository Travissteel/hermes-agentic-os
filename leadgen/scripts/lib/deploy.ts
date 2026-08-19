/**
 * Deploy a scaffolded lead gen site to Cloudflare Workers via the OpenNext
 * adapter (`bun run deploy` in the site dir), then set its runtime secrets.
 *
 * Gated on CF_API_TOKEN + CF_ACCOUNT_ID in ~/.hermes/.env — if either is
 * missing, deploySite() returns { ok:false, skipped:true } with a clear
 * reason instead of throwing, so scaffolding + push still work without CF
 * credentials configured. Secrets are piped via stdin, never on the command
 * line, and never printed.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { REGISTRY } from "./scaffold";

const ENV_PATH = path.join(homedir(), ".hermes", ".env");
/** Worker secrets sourced from ~/.hermes/.env and set on every site. */
const SECRET_KEYS = ["RESEND_API_KEY", "LEAD_TO_EMAIL", "LEAD_FROM_EMAIL"] as const;

export interface DeployResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
}

function parseEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function siteDir(slug: string): string | null {
  if (!existsSync(REGISTRY)) return null;
  const registry = JSON.parse(readFileSync(REGISTRY, "utf8"));
  const site = registry.sites.find((s: { slug: string }) => s.slug === slug);
  return site?.localPath ?? null;
}

export async function deploySite(slug: string): Promise<DeployResult> {
  const dir = siteDir(slug);
  if (!dir || !existsSync(dir)) {
    return { ok: false, reason: `no local clone for "${slug}" (not scaffolded?)` };
  }

  const env = parseEnv();
  const token = env.CF_API_TOKEN;
  const account = env.CF_ACCOUNT_ID;
  if (!token || !account) {
    return {
      ok: false,
      skipped: true,
      reason:
        "CF_API_TOKEN / CF_ACCOUNT_ID not set in ~/.hermes/.env — deploy skipped (scaffold + push are unaffected).",
    };
  }

  const cfEnv = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: token,
    CLOUDFLARE_ACCOUNT_ID: account,
  };

  try {
    console.log(`→ [${slug}] deploying to Cloudflare Workers (bun run deploy)`);
    execSync("bun run deploy", { cwd: dir, stdio: "inherit", env: cfEnv });

    // Secrets are read at request time — no redeploy needed after setting them.
    for (const key of SECRET_KEYS) {
      const value = env[key];
      if (!value) continue;
      console.log(`→ [${slug}] setting secret ${key}`);
      execSync(`bunx wrangler secret put ${key}`, {
        cwd: dir,
        input: value,
        env: cfEnv,
        stdio: ["pipe", "inherit", "inherit"],
      });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
