"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SubscriptionCard } from "@/components/subscription-card";
import { ProviderCard } from "@/components/provider-card";
import { ModelShelf } from "@/components/model-shelf";
import { HermesActivityByModel } from "@/components/hermes-activity-by-model";
import type { Provider } from "@/lib/providers";
import type { Subscription } from "@/app/api/subscriptions/route";

type CategoryTitle = {
  category: Provider["category"];
  title: string;
  blurb: string;
};

const CATEGORIES: CategoryTitle[] = [
  {
    category: "ai-model",
    title: "AI / Model Providers",
    blurb: "Inference providers. OpenRouter shows live spend; others show presence only.",
  },
  {
    category: "service",
    title: "Service Integrations",
    blurb: "External APIs Hermes calls during automation pipelines.",
  },
  {
    category: "platform",
    title: "Platform Tokens",
    blurb: "Social, messaging, and code-hosting tokens used by skills and crons.",
  },
  {
    category: "config",
    title: "Local Configuration",
    blurb: "Non-secret endpoints — local Ollama, Postiz URL, etc.",
  },
];

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
        {title}
      </h3>
      {hint && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function ModelsApisView() {
  const subs = useSWR<{ subscriptions: Subscription[] }>(
    "/api/subscriptions",
    fetcher
  );
  const providers = useSWR<{ providers: Provider[] }>(
    "/api/providers",
    fetcher,
    { refreshInterval: 30_000 }
  );

  const allProviders = providers.data?.providers ?? [];
  const subscriptions = subs.data?.subscriptions ?? [];

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-6">
        {/* Real activity (top — most useful at a glance) */}
        <section className="space-y-3">
          <SectionHeading
            title="Hermes Activity by Model Family"
            hint="Real session counts parsed from ~/.hermes/sessions/ — the truest progress bar we have for ChatGPT Plus / Claude Pro / Gemini, since none expose live quotas."
          />
          <HermesActivityByModel />
        </section>

        <Separator />

        {/* Subscriptions */}
        <section className="space-y-3">
          <SectionHeading
            title="Active Subscriptions"
            hint="Manually curated. Edit shared/subscriptions.json to change."
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {subscriptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No subscriptions configured.
              </p>
            ) : (
              subscriptions.map((s) => (
                <SubscriptionCard key={s.id} sub={s} />
              ))
            )}
          </div>
          {subscriptions.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Total: ${subscriptions
                .filter((s) => s.status === "active" && s.billing === "monthly")
                .reduce((acc, s) => acc + s.price_usd, 0)}
              /mo
            </p>
          )}
        </section>

        <Separator />

        {/* Providers grouped by category */}
        {CATEGORIES.map((cat) => {
          const items = allProviders.filter((p) => p.category === cat.category);
          if (items.length === 0) return null;
          return (
            <section key={cat.category} className="space-y-3">
              <SectionHeading title={cat.title} hint={cat.blurb} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => (
                  <ProviderCard key={p.envVar} provider={p} />
                ))}
              </div>
            </section>
          );
        })}

        <Separator />

        {/* Models */}
        <section className="space-y-3">
          <SectionHeading
            title="Available Models"
            hint="From Hermes model catalog + local Ollama. Click a provider tab to filter."
          />
          <ModelShelf />
        </section>
      </div>
    </ScrollArea>
  );
}
