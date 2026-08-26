/**
 * GEO (Generative Engine Optimization) building block: a question as a
 * heading followed immediately by a concise, self-contained, quotable
 * answer paragraph. AI search engines lift these verbatim — the first
 * paragraph must stand alone without pronouns referring outside the block.
 *
 * Deliberately NOT an accordion. Collapsing these behind a <details> would
 * look tidier, but the entire point is verbatim extraction, and hidden text
 * is a category of content extractors treat with suspicion. It stays open,
 * in the DOM, and readable.
 *
 * Carries no outer margin so it can sit in a grid; stacked call sites
 * supply their own spacing.
 */
export function AnswerBlock({
  question,
  answer,
  className = "",
  children,
}: {
  question: string;
  answer: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`card answer-block p-6 ${className}`}>
      <h2 className="h3 text-foreground">{question}</h2>
      <p className="mt-2.5 leading-relaxed text-muted">{answer}</p>
      {children}
    </section>
  );
}
