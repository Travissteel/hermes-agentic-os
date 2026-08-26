"use client";

import { useState } from "react";
import {
  COUNTER_VISIBLE_FROM,
  COUNTER_WARN_FROM,
  LEAD_LIMITS,
} from "@/lib/lead-form";
import { SITE } from "@/site.config";

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
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p className="mt-3 text-lg font-bold tracking-tight text-slate-900">
          Request received
        </p>
        <p className="mt-1 text-slate-600">
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
      {/* Config-driven qualifying questions. Two columns from `sm` up so a
          handful of dropdowns doesn't read as a long form — the perceived
          length is what drives abandonment, not the field count. */}
      {SITE.qualifiers?.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {SITE.qualifiers.map((q) => (
            <label key={q.name} className="grid gap-1 text-sm">
              <span className="font-medium text-foreground">
                {q.label}
                {!q.required && (
                  <span className="ml-1 font-normal text-muted">(optional)</span>
                )}
              </span>
              {q.type === "select" ? (
                <select
                  name={q.name}
                  required={q.required}
                  defaultValue=""
                  className="field"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {q.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={q.name}
                  required={q.required}
                  maxLength={LEAD_LIMITS.qualifier}
                  placeholder={q.placeholder}
                  className="field"
                />
              )}
            </label>
          ))}
        </div>
      ) : null}
      <div>
        <textarea
          name="message"
          required
          maxLength={LEAD_LIMITS.message}
          rows={4}
          placeholder={SITE.messagePrompt ?? "What do you need done?"}
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
        className="btn btn--accent w-full disabled:opacity-50"
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
