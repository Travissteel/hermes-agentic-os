import { NextResponse } from "next/server";
import { SITE } from "@/site.config";
import { getAllAreas } from "@/lib/locations";
import { scoreLead } from "@/lib/spam-filter";
import { LEAD_LIMITS } from "@/lib/lead-form";

export const dynamic = "force-dynamic";

interface LeadPayload {
  name?: string;
  phone?: string;
  suburb?: string;
  message?: string;
  sourcePage?: string;
  company_website?: string; // honeypot
  /** Config-driven qualifier answers, keyed by SITE.qualifiers[].name. */
  [key: string]: unknown;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Pull qualifier answers off the payload, driven entirely by SITE.qualifiers.
 *
 * Keys not declared in the config are ignored, and `select` answers must match
 * a declared option exactly. Without that whitelist a crafted POST could put
 * arbitrary attacker-chosen text into an email you read and act on.
 */
function collectQualifiers(body: LeadPayload): { label: string; value: string }[] {
  const answers: { label: string; value: string }[] = [];
  for (const q of SITE.qualifiers ?? []) {
    const raw = clean(body[q.name], LEAD_LIMITS.qualifier);
    if (!raw) continue;
    if (q.type === "select" && !q.options?.includes(raw)) continue;
    answers.push({ label: q.label, value: raw });
  }
  return answers;
}

export async function POST(request: Request) {
  let body: LeadPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Honeypot filled → pretend success so bots learn nothing.
  if (body.company_website) {
    return NextResponse.json({ ok: true });
  }

  const lead = {
    name: clean(body.name, LEAD_LIMITS.name),
    phone: clean(body.phone, LEAD_LIMITS.phone),
    suburb: clean(body.suburb, LEAD_LIMITS.suburb),
    message: clean(body.message, LEAD_LIMITS.message),
    sourcePage: clean(body.sourcePage, LEAD_LIMITS.sourcePage),
    receivedAt: new Date().toISOString(),
  };
  if (!lead.name || !lead.phone || !lead.message) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const qualifiers = collectQualifiers(body);
  const missingRequired = (SITE.qualifiers ?? [])
    .filter((q) => q.required)
    .filter((q) => !qualifiers.some((a) => a.label === q.label));
  if (missingRequired.length) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Advisory only — flagged leads are still delivered, just marked. The counts
  // logged here are what `wrangler tail` / Workers Logs can be queried on to
  // compare spam volume against real volume.
  const verdict = scoreLead(lead, getAllAreas(), {
    brandName: SITE.brandName,
    city: SITE.location.city,
    postcode: SITE.location.postcode,
  });
  console.log(
    verdict.isSpam ? "[lead:flagged]" : "[lead:clean]",
    JSON.stringify({
      score: verdict.score,
      reasons: verdict.reasons,
      suburb: lead.suburb,
      sourcePage: lead.sourcePage,
    }),
  );

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_TO_EMAIL;

  if (!apiKey || !to) {
    // Local dev / misconfigured deploy: log instead of dropping the lead.
    console.log("[lead:dev-mode]", JSON.stringify(lead));
    return NextResponse.json({ ok: true, delivered: false });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.LEAD_FROM_EMAIL ?? "leads@resend.dev",
    to,
    replyTo: SITE.email,
    subject: verdict.isSpam
      ? `[SUSPECTED SPAM] ${lead.suburb} — ${SITE.brandName}`
      : `New lead — ${lead.suburb} — ${SITE.brandName}`,
    html: [
      verdict.isSpam
        ? [
            `<div style="border:2px solid #b91c1c;background:#fef2f2;padding:12px;margin-bottom:16px">`,
            `<p style="margin:0 0 6px;font-weight:bold;color:#b91c1c">Suspected spam (score ${verdict.score})</p>`,
            `<ul style="margin:0;padding-left:18px;color:#7f1d1d">`,
            ...verdict.reasons.map((r) => `<li>${escapeHtml(r)}</li>`),
            `</ul></div>`,
          ].join("")
        : "",
      `<h2>New quote request via ${SITE.brandName}</h2>`,
      `<p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>`,
      `<p><strong>Phone:</strong> ${escapeHtml(lead.phone)}</p>`,
      `<p><strong>Suburb:</strong> ${escapeHtml(lead.suburb)}</p>`,
      // Boxed so the whole block can be forwarded to an operator as-is — this
      // is the part they price the job from.
      qualifiers.length
        ? [
            `<div style="border:1px solid #d4d4d8;border-radius:6px;padding:12px;margin:12px 0">`,
            `<p style="margin:0 0 8px;font-weight:bold">Job details</p>`,
            ...qualifiers.map(
              (a) =>
                `<p style="margin:0 0 4px">${escapeHtml(a.label)}: <strong>${escapeHtml(a.value)}</strong></p>`,
            ),
            `</div>`,
          ].join("")
        : "",
      // pre-wrap so paragraph breaks in a long enquiry survive into the email.
      `<p><strong>Job:</strong></p>`,
      `<p style="white-space:pre-wrap;margin:0 0 12px">${escapeHtml(lead.message)}</p>`,
      `<p><strong>Page:</strong> ${escapeHtml(lead.sourcePage)}</p>`,
      `<p><strong>Received:</strong> ${lead.receivedAt}</p>`,
    ].join("\n"),
  });

  if (error) {
    console.error("[lead:resend-error]", error);
    return NextResponse.json({ error: "delivery failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, delivered: true });
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
