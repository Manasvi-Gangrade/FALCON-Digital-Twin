import { type Severity, severityColor } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export function StatusDot({ severity, className }: { severity: Severity; className?: string }) {
  const color = severityColor(severity);
  const fast = severity === "critical";
  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5 items-center justify-center", className)}>
      <span
        className={cn("absolute rounded-full border", fast ? "anim-pulse-ring-fast" : "anim-pulse-ring")}
        style={{ borderColor: color, width: "20px", height: "20px" }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}

export function StatusChip({ severity }: { severity: Severity }) {
  const color = severityColor(severity);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase mono"
      style={{
        borderColor: color,
        color,
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
    >
      <StatusDot severity={severity} />
      {severity}
    </span>
  );
}
