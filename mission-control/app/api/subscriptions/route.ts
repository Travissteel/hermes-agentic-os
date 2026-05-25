import { readFile } from "node:fs/promises";
import { PATHS } from "@/lib/paths";

export const dynamic = "force-dynamic";

export type RateLimit = {
  label: string;
  value: number | string;
  tier?: string;
  note?: string;
};

export type Subscription = {
  id: string;
  name: string;
  vendor: string;
  price_usd: number;
  billing: "monthly" | "annual" | "included" | "usage";
  purpose: string;
  status: "active" | "paused" | "cancelled";
  features?: string[];
  rate_limits?: RateLimit[];
  docs_url?: string;
  /** Glob-ish patterns matched against Hermes session `model` values. */
  tracked_models?: string[];
};

export async function GET() {
  try {
    const raw = await readFile(PATHS.shared.subscriptions, "utf8");
    const data = JSON.parse(raw) as { subscriptions?: Subscription[] };
    return Response.json({ subscriptions: data.subscriptions ?? [] });
  } catch (e) {
    console.error("subscriptions read failed:", e);
    return Response.json({ subscriptions: [] });
  }
}
