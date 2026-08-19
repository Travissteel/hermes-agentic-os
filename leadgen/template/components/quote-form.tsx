"use client";

import { useState } from "react";
import {
  COUNTER_VISIBLE_FROM,
  COUNTER_WARN_FROM,
  LEAD_LIMITS,
} from "@/lib/lead-form";

type FormState = "idle" | "sending" | "sent" | "error";

/**
 * The lead capture form. POSTs to /api/lead. The hidden "company_website"
 * field is a honeypot — bots fill it, humans never see it.
 */
export function QuoteForm({ sourcePage }: { sourcePage: string }) {
  const [state, setState] = useState<FormState>("idle");
  const [messageLength, setMessageLength] = useState(0);

  const remaining = LEAD_LIMITS.message - messageLength;
  const showCounter = messageLength >= COUNTER_VISIBLE_FROM;
  const warn = messageLength >= COUNTER_WARN_FROM;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...data, sourcePage }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("sent");
      form.reset();
      setMessageLength(0);
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Request received</p>
        <p className="mt-1 text-muted">
          Local pros will be in touch with your quote shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <input
        name="name"
        required
        maxLength={LEAD_LIMITS.name}
        placeholder="Your name"
        className="field"
        autoComplete="name"
      />
      <input
        name="phone"
        required
        maxLength={LEAD_LIMITS.phone}
        placeholder="Phone number"
        className="field"
        autoComplete="tel"
        inputMode="tel"
      />
      <input
        name="suburb"
        required
        maxLength={LEAD_LIMITS.suburb}
        placeholder="Suburb"
        className="field"
        autoComplete="address-level2"
      />
      <div>
        <textarea
          name="message"
          required
          maxLength={LEAD_LIMITS.message}
          rows={4}
          placeholder="What do you need done?"
          className="field resize-y"
          onChange={(e) => setMessageLength(e.target.value.length)}
          aria-describedby="message-counter"
        />
        {/* Stays hidden until the cap is actually in sight, so a short
            enquiry never sees a limit it will not reach. */}
        <p
          id="message-counter"
          aria-live="polite"
          className={`mt-1 text-right text-xs ${
            showCounter ? (warn ? "text-amber-600" : "text-muted") : "invisible"
          }`}
        >
          {remaining.toLocaleString()} characters left
        </p>
      </div>
      <input
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="honeypot"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="rounded-lg bg-primary px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Get My Free Quotes"}
      </button>
      {state === "error" && (
        <p className="text-sm text-red-600">
          Something went wrong — please try again or email us directly.
        </p>
      )}
      <p className="text-xs text-muted">
        Free service. No obligation. Your details go only to local pros who can
        quote your job.
      </p>
    </form>
  );
}
