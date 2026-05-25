import { cn } from "@/lib/utils";

type StatusDotProps = {
  status: "working" | "idle" | "offline" | "paused";
  size?: "sm" | "md";
  className?: string;
};

const styles: Record<StatusDotProps["status"], string> = {
  working: "bg-emerald-400 shadow-emerald-400/50 animate-pulse",
  idle: "bg-zinc-400",
  paused: "bg-amber-400",
  offline: "bg-zinc-700",
};

export function StatusDot({ status, size = "md", className }: StatusDotProps) {
  const dim = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  return (
    <span
      aria-label={status}
      className={cn(
        "inline-block rounded-full shadow-[0_0_8px_currentColor]",
        dim,
        styles[status],
        className
      )}
    />
  );
}
