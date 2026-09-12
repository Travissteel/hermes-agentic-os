"use client";

import { useId, useState } from "react";
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
  const formId = useId();
  const counterId = `${formId}-message-counter`;
  const requiredQualifiers = (SITE.qualifiers ?? []).filter((q) => q.required);
  const optionalQualifiers = (SITE.qualifiers ?? []).filter((q) => !q.required);
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
      const result = await res.json();
      if (result.delivered === false) throw new Error("Delivery unavailable");
      setState("sent");
      form.reset();
      setMessageLength(0);
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
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
          We&apos;ll be in touch shortly to arrange a look at the job.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Your name
          <input name="name" required maxLength={LEAD_LIMITS.name} className="field" autoComplete="name" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Phone number
          <input name="phone" type="tel" required maxLength={LEAD_LIMITS.phone} className="field" autoComplete="tel" inputMode="tel" />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Suburb
        <input name="suburb" required maxLength={LEAD_LIMITS.suburb} className="field" autoComplete="address-level2" />
      </label>
      {requiredQualifiers.map((q) => (
        <label key={q.name} className="grid gap-1 text-sm font-medium">
          {q.label}
          {q.type === "select" ? (
            <select name={q.name} required defaultValue="" className="field">
              <option value="" disabled>Choose…</option>
              {q.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : <input name={q.name} required maxLength={LEAD_LIMITS.qualifier} placeholder={q.placeholder} className="field" />}
        </label>
      ))}
      <div>
        <label htmlFor={`${formId}-message`} className="mb-1 block text-sm font-medium">What do you need done?</label>
        <textarea
          id={`${formId}-message`}
          name="message"
          required
          maxLength={LEAD_LIMITS.message}
          rows={3}
          placeholder={SITE.messagePrompt ?? "What do you need done?"}
          className="field resize-y"
          onChange={(e) => setMessageLength(e.target.value.length)}
          aria-describedby={showCounter ? counterId : undefined}
        />
        {/* Stays hidden until the cap is actually in sight, so a short
            enquiry never sees a limit it will not reach. */}
        <p
          id={counterId}
          aria-live="polite"
          className={`mt-1 text-right text-xs ${
            showCounter ? (warn ? "text-amber-600" : "text-muted") : "hidden"
          }`}
        >
          {remaining.toLocaleString()} characters left
        </p>
      </div>
      {optionalQualifiers.length > 0 && (
        <details className="job-details">
          <summary>More job details <span className="font-normal text-muted">(optional)</span></summary>
          <div className="grid gap-3 pt-3 sm:grid-cols-2">
            {optionalQualifiers.map((q) => (
              <label key={q.name} className="grid gap-1 text-sm font-medium">
                {q.label}
                {q.type === "select" ? (
                  <select name={q.name} defaultValue="" className="field">
                    <option value="">Not sure / skip</option>
                    {q.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : <input name={q.name} maxLength={LEAD_LIMITS.qualifier} placeholder={q.placeholder} className="field" />}
              </label>
            ))}
          </div>
        </details>
      )}
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
        {state === "sending" ? "Sending…" : "Request a free quote"}
      </button>
      {state === "error" && (
        <p role="alert" className="text-sm text-red-600">
          Something went wrong — your details are still here. Please try again or{" "}<a className="underline" href={`mailto:${SITE.email}`}>email us directly</a>.
        </p>
      )}
      <p className="text-xs text-muted">
        Free quote, no obligation. We use your details to quote your job and
        nothing else.
      </p>
    </form>
  );
}
