/**
 * GEO (Generative Engine Optimization) building block: a question as a
 * heading followed immediately by a concise, self-contained, quotable
 * answer paragraph. AI search engines lift these verbatim — the first
 * paragraph must stand alone without pronouns referring outside the block.
 */
export function AnswerBlock({
  question,
  answer,
  children,
}: {
  question: string;
  answer: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="answer-block">
      <h2 className="text-xl font-semibold text-foreground">{question}</h2>
      <p className="mt-2 leading-relaxed text-muted">{answer}</p>
      {children}
    </section>
  );
}
