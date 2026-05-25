import { getRawSecret } from "./providers";

export type GeminiInfo = {
  available: boolean;
  modelCount: number;
  models: string[];
  /** Free-tier rate limits — publicly documented reference values, not live usage. */
  freeTierLimits: Array<{ model: string; rpm: number; rpd: number }>;
  lastCheckedAt: string;
  error?: string;
};

const FREE_TIER_LIMITS = [
  { model: "gemini-2.5-pro", rpm: 5, rpd: 100 },
  { model: "gemini-2.5-flash", rpm: 10, rpd: 1500 },
  { model: "gemini-2.0-flash", rpm: 15, rpd: 1500 },
  { model: "gemini-2.0-flash-lite", rpm: 30, rpd: 1500 },
  { model: "gemini-1.5-pro", rpm: 5, rpd: 50 },
  { model: "gemini-1.5-flash", rpm: 15, rpd: 1500 },
];

export async function getGeminiInfo(): Promise<GeminiInfo> {
  const key = await getRawSecret("GEMINI_API_KEY");
  const now = new Date().toISOString();
  if (!key) {
    return {
      available: false,
      modelCount: 0,
      models: [],
      freeTierLimits: FREE_TIER_LIMITS,
      lastCheckedAt: now,
      error: "GEMINI_API_KEY not set in ~/.hermes/.env",
    };
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { cache: "no-store", signal: AbortSignal.timeout(5_000) }
    );
    if (!res.ok) {
      return {
        available: false,
        modelCount: 0,
        models: [],
        freeTierLimits: FREE_TIER_LIMITS,
        lastCheckedAt: now,
        error: `HTTP ${res.status}`,
      };
    }
    const body = (await res.json()) as { models?: Array<{ name?: string }> };
    const models = (body.models ?? [])
      .map((m) => m.name?.replace(/^models\//, "") ?? "")
      .filter(Boolean);
    return {
      available: true,
      modelCount: models.length,
      models,
      freeTierLimits: FREE_TIER_LIMITS,
      lastCheckedAt: now,
    };
  } catch (e) {
    return {
      available: false,
      modelCount: 0,
      models: [],
      freeTierLimits: FREE_TIER_LIMITS,
      lastCheckedAt: now,
      error: e instanceof Error ? e.message : "unknown error",
    };
  }
}
