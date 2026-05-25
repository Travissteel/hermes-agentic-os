import { readFile } from "node:fs/promises";
import { PATHS } from "./paths";

export type ModelInfo = {
  id: string;
  provider: string;
  description: string | null;
  context: number | null;
  pricing: {
    promptUsdPerMillion: number | null;
    completionUsdPerMillion: number | null;
  } | null;
};

export type ModelGroup = {
  provider: string;
  source: "hermes-catalog" | "ollama-local";
  count: number;
  models: ModelInfo[];
};

type CatalogProvider = {
  models?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
};

type Catalog = {
  version?: number;
  updated_at?: string;
  providers?: Record<string, CatalogProvider>;
};

function toNum(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function normalizeModel(provider: string, raw: Record<string, unknown>): ModelInfo {
  const pricing = raw.pricing as Record<string, unknown> | undefined;
  return {
    id: String(raw.id ?? raw.name ?? ""),
    provider,
    description: typeof raw.description === "string" ? raw.description : null,
    context: toNum(raw.context_length ?? raw.context ?? raw.max_context_length),
    pricing: pricing
      ? {
          promptUsdPerMillion: toNum(pricing.prompt ?? pricing.input),
          completionUsdPerMillion: toNum(pricing.completion ?? pricing.output),
        }
      : null,
  };
}

export async function getCatalogModels(): Promise<ModelGroup[]> {
  try {
    const raw = await readFile(PATHS.hermes.home + "/cache/model_catalog.json", "utf8");
    const data = JSON.parse(raw) as Catalog;
    const providers = data.providers ?? {};
    const groups: ModelGroup[] = [];
    for (const [providerName, providerData] of Object.entries(providers)) {
      const models = (providerData.models ?? []).map((m) => normalizeModel(providerName, m));
      groups.push({
        provider: providerName,
        source: "hermes-catalog",
        count: models.length,
        models,
      });
    }
    return groups;
  } catch (e) {
    console.error("getCatalogModels failed:", e);
    return [];
  }
}

type OllamaTags = {
  models?: Array<{ name: string; size?: number; details?: { parameter_size?: string } }>;
};

export async function getOllamaModels(): Promise<ModelGroup | null> {
  const base = process.env.OLLAMA_BASE_URL || "http://172.18.0.1:11434";
  try {
    const res = await fetch(`${base}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as OllamaTags;
    const models = (body.models ?? []).map(
      (m): ModelInfo => ({
        id: m.name,
        provider: "ollama",
        description: m.details?.parameter_size ?? null,
        context: null,
        pricing: null,
      })
    );
    return {
      provider: "ollama",
      source: "ollama-local",
      count: models.length,
      models,
    };
  } catch {
    return null;
  }
}

export async function getAllModels(): Promise<ModelGroup[]> {
  const [catalog, ollama] = await Promise.all([getCatalogModels(), getOllamaModels()]);
  return ollama ? [...catalog, ollama] : catalog;
}
