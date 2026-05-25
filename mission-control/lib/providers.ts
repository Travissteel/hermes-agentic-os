/**
 * Provider detection from ~/.hermes/.env.
 *
 * Security model: this file runs server-side ONLY. The full key value is read
 * here so it can be passed to provider-specific usage APIs (e.g. OpenRouter
 * /auth/key). The HTTP responses returned to the browser MUST contain only
 * the redacted preview, never the raw value. Use `redactKey()` for that.
 */
import { readFile } from "node:fs/promises";
import { PATHS } from "./paths";

export type ProviderCategory =
  | "ai-model"
  | "service"
  | "platform"
  | "config";

export type AuthMethod = "env-var" | "session" | "oauth";

export type Provider = {
  envVar: string;
  displayName: string;
  category: ProviderCategory;
  isConfigured: boolean;
  keyPreview: string | null;
  authMethod: AuthMethod;
  /** True if this provider has a live usage endpoint we can call. */
  hasLiveUsage: boolean;
  /** Slug for the per-provider info endpoint, e.g. "openrouter", "gemini", "notebooklm". */
  infoSlug?: string;
};

/**
 * Map env var names → display info. Anything not in this map is ignored
 * (so we don't surface random debug-toggle vars as if they were providers).
 */
const PROVIDER_MAP: Array<{
  envVar: string;
  displayName: string;
  category: ProviderCategory;
  infoSlug?: string;
}> = [
  // AI / model providers
  { envVar: "OPENROUTER_API_KEY", displayName: "OpenRouter", category: "ai-model", infoSlug: "openrouter" },
  { envVar: "GEMINI_API_KEY", displayName: "Google Gemini", category: "ai-model", infoSlug: "gemini" },
  { envVar: "VOICE_TOOLS_OPENAI_KEY", displayName: "OpenAI (voice)", category: "ai-model" },
  { envVar: "OLLAMA_API_KEY", displayName: "Ollama Cloud", category: "ai-model" },

  // Service integrations
  { envVar: "TAVILY_API_KEY", displayName: "Tavily Search", category: "service" },
  { envVar: "BEEHIIV_API_KEY", displayName: "Beehiiv", category: "service" },
  { envVar: "POSTIZ_API_KEY", displayName: "Postiz", category: "service" },
  { envVar: "BROWSERBASE_ADVANCED_STEALTH", displayName: "Browserbase", category: "service" },

  // Platform tokens
  { envVar: "TELEGRAM_BOT_TOKEN", displayName: "Telegram", category: "platform" },
  { envVar: "GITHUB_TOKEN", displayName: "GitHub", category: "platform" },
  { envVar: "BSF_GITHUB_TOKEN", displayName: "GitHub · BSF", category: "platform" },
  { envVar: "HF_GITHUB_TOKEN", displayName: "GitHub · HF", category: "platform" },
  { envVar: "X_BEARER_TOKEN", displayName: "X (Twitter)", category: "platform" },

  // Config (not API keys but worth showing as part of provider setup)
  { envVar: "OLLAMA_BASE_URL", displayName: "Ollama (local)", category: "config" },
  { envVar: "POSTIZ_BASE_URL", displayName: "Postiz URL", category: "config" },
];

/** Providers that don't use env vars (browser session, OAuth, etc.). */
const VIRTUAL_PROVIDERS: Array<{
  key: string;
  displayName: string;
  category: ProviderCategory;
  authMethod: AuthMethod;
  infoSlug?: string;
  // For OAuth/session providers we report config status by probing an API.
}> = [
  {
    key: "ANTIGRAVITY",
    displayName: "Google Antigravity",
    category: "ai-model",
    authMethod: "oauth",
    infoSlug: "antigravity",
  },
  {
    key: "NOTEBOOKLM",
    displayName: "NotebookLM",
    category: "ai-model",
    authMethod: "session",
    infoSlug: "notebooklm",
  },
];

/** Returns null if value is too short to safely preview. */
export function redactKey(value: string | undefined): string | null {
  if (!value || value.length < 8) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    // Config-style values (URLs) — show fully, they aren't secrets.
    return value;
  }
  const head = value.slice(0, 4);
  const tail = value.slice(-4);
  return `${head}…${tail}`;
}

/** Parses ~/.hermes/.env into a flat key→value map. */
async function readEnvFile(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(`${PATHS.hermes.home}/.env`, "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    }
    return out;
  } catch (e) {
    console.error("readEnvFile failed:", e);
    return {};
  }
}

/** Returns the raw value of one env var. Server-side only. */
export async function getRawSecret(envVar: string): Promise<string | undefined> {
  const env = await readEnvFile();
  return env[envVar];
}

/** Returns the list of providers safe to expose to the browser. */
export async function getProviders(): Promise<Provider[]> {
  const env = await readEnvFile();
  const envBased: Provider[] = PROVIDER_MAP.map((p) => {
    const value = env[p.envVar];
    return {
      envVar: p.envVar,
      displayName: p.displayName,
      category: p.category,
      isConfigured: Boolean(value),
      keyPreview: redactKey(value),
      authMethod: "env-var" as const,
      hasLiveUsage: Boolean(p.infoSlug && value),
      infoSlug: p.infoSlug,
    };
  });
  // Virtual providers (NotebookLM, etc.) — config status is determined by
  // their /api/providers/<slug>/info route, not by an env var. We mark them
  // as configured=true so they always render and the card itself surfaces the
  // real auth state.
  const virtual: Provider[] = VIRTUAL_PROVIDERS.map((v) => ({
    envVar: v.key,
    displayName: v.displayName,
    category: v.category,
    isConfigured: true,
    keyPreview: null,
    authMethod: v.authMethod,
    hasLiveUsage: Boolean(v.infoSlug),
    infoSlug: v.infoSlug,
  }));
  return [...envBased, ...virtual];
}
