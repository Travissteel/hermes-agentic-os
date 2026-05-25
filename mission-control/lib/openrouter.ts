import { getRawSecret } from "./providers";

export type OpenRouterUsage = {
  label: string;
  limit: number | null; // null = unlimited
  limitReset: string | null; // e.g. "daily"
  limitRemaining: number | null;
  usageLifetime: number;
  usageDaily: number;
  usageWeekly: number;
  usageMonthly: number;
  isFreeTier: boolean;
  expiresAt: string | null;
};

type ORResponse = {
  data?: {
    label?: string;
    limit?: number | null;
    limit_reset?: string | null;
    limit_remaining?: number | null;
    usage?: number;
    usage_daily?: number;
    usage_weekly?: number;
    usage_monthly?: number;
    is_free_tier?: boolean;
    expires_at?: string | null;
  };
};

export async function getOpenRouterUsage(): Promise<OpenRouterUsage | null> {
  const key = await getRawSecret("OPENROUTER_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      console.error("openrouter usage HTTP", res.status);
      return null;
    }
    const body = (await res.json()) as ORResponse;
    const d = body.data ?? {};
    return {
      label: d.label ?? "(unknown)",
      limit: d.limit ?? null,
      limitReset: d.limit_reset ?? null,
      limitRemaining: d.limit_remaining ?? null,
      usageLifetime: d.usage ?? 0,
      usageDaily: d.usage_daily ?? 0,
      usageWeekly: d.usage_weekly ?? 0,
      usageMonthly: d.usage_monthly ?? 0,
      isFreeTier: Boolean(d.is_free_tier),
      expiresAt: d.expires_at ?? null,
    };
  } catch (e) {
    console.error("getOpenRouterUsage failed:", e);
    return null;
  }
}
