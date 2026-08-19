/**
 * Field limits shared between the client form (components/quote-form.tsx) and
 * the server route (app/api/lead/route.ts). Keep them in one place — if the
 * server cap were ever lower than the textarea's, a customer could type a long
 * enquiry and have the tail silently dropped after submitting.
 */
export const LEAD_LIMITS = {
  name: 100,
  phone: 20,
  suburb: 80,
  message: 4000,
  sourcePage: 200,
} as const;

/** Show the character counter once the message gets within this of the cap. */
export const COUNTER_VISIBLE_FROM = LEAD_LIMITS.message - 1000;
/** Warn (amber) from here up. */
export const COUNTER_WARN_FROM = LEAD_LIMITS.message - 200;
