import { NextResponse } from "next/server";
import { SITE } from "@/site.config";

export const dynamic = "force-dynamic";

interface LeadPayload {
  name?: string;
  phone?: string;
  suburb?: string;
  message?: string;
  sourcePage?: string;
  company_website?: string; // honeypot
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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
    name: clean(body.name, 100),
    phone: clean(body.phone, 20),
    suburb: clean(body.suburb, 80),
    message: clean(body.message, 2000),
    sourcePage: clean(body.sourcePage, 200),
    receivedAt: new Date().toISOString(),
  };
  if (!lead.name || !lead.phone || !lead.message) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

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
    subject: `New lead — ${lead.suburb} — ${SITE.brandName}`,
    html: [
      `<h2>New quote request via ${SITE.brandName}</h2>`,
      `<p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>`,
      `<p><strong>Phone:</strong> ${escapeHtml(lead.phone)}</p>`,
      `<p><strong>Suburb:</strong> ${escapeHtml(lead.suburb)}</p>`,
      `<p><strong>Job:</strong> ${escapeHtml(lead.message)}</p>`,
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
