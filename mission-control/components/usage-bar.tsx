import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  max?: number | null;
  /** USD value to format value/max as money. If false, formats as plain number. */
  asMoney?: boolean;
  /** Tone shifts the bar color. */
  tone?: "default" | "warn" | "danger";
  className?: string;
};

function fmt(n: number, money: boolean): string {
  if (money) {
    if (n >= 100) return `$${n.toFixed(2)}`;
    if (n >= 1) return `$${n.toFixed(3)}`;
    return `$${n.toFixed(4)}`;
  }
  return n.toLocaleString();
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-emerald-400",
  warn: "bg-amber-400",
  danger: "bg-rose-400",
};

export function UsageBar({
  label,
  value,
  max,
  asMoney = true,
  tone = "default",
  className,
}: Props) {
  const hasMax = typeof max === "number" && max > 0;
  const pct = hasMax ? Math.min(100, (value / max) * 100) : 0;
  const autoTone =
    !hasMax ? tone : pct >= 90 ? "danger" : pct >= 70 ? "warn" : tone;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          {fmt(value, asMoney)}
          {hasMax && (
            <span className="text-muted-foreground"> / {fmt(max, asMoney)}</span>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", TONE[autoTone])}
          style={{ width: hasMax ? `${pct}%` : "100%", opacity: hasMax ? 1 : 0.25 }}
        />
      </div>
      {!hasMax && (
        <p className="text-[10px] text-muted-foreground">no quota cap</p>
      )}
    </div>
  );
}
