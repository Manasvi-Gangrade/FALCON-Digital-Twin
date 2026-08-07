import { useMemo, useState } from "react";
import type { Engine } from "@/lib/telemetry";
import { severityColor } from "@/lib/telemetry";
import { StatusChip } from "../StatusDot";
import { ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Line, LineChart, ResponsiveContainer } from "recharts";

type SortKey = "priority" | "health" | "rul" | "confidence";

const priorityScore = (e: Engine) =>
  (100 - e.health) * 2 + (300 - e.rul) * 0.4 + (100 - e.confidence) * 0.6 + (e.degraded ? 40 : 0);

export function PriorityBoard({
  engines,
  onOpenEngine,
}: {
  engines: Engine[];
  onOpenEngine: (id: string) => void;
}) {
  const [sort, setSort] = useState<SortKey>("priority");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...engines];
    if (sort === "priority") arr.sort((a, b) => priorityScore(b) - priorityScore(a));
    if (sort === "health") arr.sort((a, b) => a.health - b.health);
    if (sort === "rul") arr.sort((a, b) => a.rul - b.rul);
    if (sort === "confidence") arr.sort((a, b) => a.confidence - b.confidence);
    return arr;
  }, [engines, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="eyebrow">Priority Board</div>
          <h2 className="mono mt-1 text-3xl font-bold">Maintenance Queue</h2>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-hud-muted" />
          {(["priority", "health", "rul", "confidence"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={cn(
                "mono rounded border px-2 py-1 text-[10px] uppercase tracking-widest transition",
                  sort === k
                    ? "border-hud-cyan text-hud-cyan"
                    : "border-hud-border text-hud-muted hover:text-white hover:border-slate-400",
              )}
              style={sort === k ? { boxShadow: "0 2px 8px rgba(14, 165, 233, 0.15)" } : undefined}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="panel panel-accent-cyan divide-y divide-hud-border">
        {sorted.map((e, i) => {
          const score = priorityScore(e);
          const isOpen = expanded === e.id;
          return (
            <div key={e.id}>
              <div
                className="anim-fade-up relative flex flex-col sm:grid cursor-pointer sm:grid-cols-[auto_2fr_1fr_1fr_1fr_auto] sm:items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 transition-all hover:bg-white/5"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => setExpanded(isOpen ? null : e.id)}
              >
                <div className="flex items-center justify-between sm:contents">
                  <div className="flex items-center gap-3">
                    {/* priority color bar */}
                    <div className="relative h-9 w-1.5 overflow-hidden rounded shrink-0">
                      <div
                        className="absolute inset-0"
                        style={{
                          background: severityColor(e.severity),
                        }}
                      />
                    </div>
                    <div>
                      <div className="mono flex items-center gap-2 text-sm font-bold">
                        <span>{e.id}</span>
                        <span className="text-hud-muted">·</span>
                        <span className="text-hud-muted">{e.tail}</span>
                      </div>
                      <div className="mono text-[10px] uppercase tracking-widest text-hud-muted">
                        {e.model}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:hidden">
                    <StatusChip severity={e.severity} />
                    {isOpen ? <ChevronDown className="h-4 w-4 text-hud-muted" /> : <ChevronRight className="h-4 w-4 text-hud-muted" />}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-hud-border/40 pt-2 sm:border-0 sm:pt-0">
                  <Field label="Health" value={e.health.toFixed(1)} color={severityColor(e.severity)} />
                  <Field label="RUL" value={`${e.rul.toFixed(0)} cyc`} />
                  <Field label="Confidence" value={`${e.confidence.toFixed(0)}%`} />
                </div>

                <div className="hidden sm:flex items-center gap-3">
                  <StatusChip severity={e.severity} />
                  <div className="mono text-[10px] uppercase tracking-widest text-hud-muted">
                    Score <span className="text-hud-text">{score.toFixed(0)}</span>
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-hud-muted" /> : <ChevronRight className="h-4 w-4 text-hud-muted" />}
                </div>
              </div>

              {isOpen && (
                <div className="anim-fade-up grid grid-cols-1 gap-4 border-t border-hud-border bg-[color:var(--hud-panel-2)] p-4 md:grid-cols-4">
                  <MiniPanel label="Compressor" v={e.subsystems.compressor} />
                  <MiniPanel label="Combustor" v={e.subsystems.combustor} />
                  <MiniPanel label="Turbine" v={e.subsystems.turbine} />
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="eyebrow text-xs font-bold text-sky-800">24-Cycle Health Sparkline Trend</div>
                      <p className="text-[10px] text-slate-600 font-sans mt-0.5">
                        <strong>What this shows:</strong> 24-operating-cycle health index trajectory & anomaly decay rate.
                      </p>
                      <div className="mt-1.5 h-16">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={Array.from({ length: 24 }).map((_, i) => ({ i, v: e.health - Math.sin(i / 2) * 3 - (e.degraded ? i * 0.4 : 0) }))}>
                            <Line type="monotone" dataKey="v" stroke={severityColor(e.severity)} strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <button
                      onClick={(evt) => {
                        evt.stopPropagation();
                        onOpenEngine(e.id);
                      }}
                      className="mono mt-2 rounded-md border border-hud-cyan/20 bg-hud-cyan/10 px-3 py-1.5 text-[11px] uppercase tracking-widest text-hud-cyan hover:bg-hud-cyan/20 transition-all hover:shadow-sm"
                    >
                      Open Detail →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="mono text-[9px] uppercase tracking-widest text-hud-muted">{label}</div>
      <div className="mono text-sm font-bold" style={{ color: color ?? "var(--hud-text)" }}>
        {value}
      </div>
    </div>
  );
}

function MiniPanel({ label, v }: { label: string; v: number }) {
  const sev = v >= 80 ? "nominal" : v >= 65 ? "watch" : v >= 45 ? "degraded" : "critical";
  const color = severityColor(sev as any);
  return (
    <div className="rounded-md border border-hud-border bg-[color:var(--hud-panel)] p-3 shadow-sm">
      <div className="eyebrow">{label}</div>
      <div className="mono mt-1 text-xl font-bold" style={{ color }}>
        {v.toFixed(1)}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded bg-black/5">
        <div
          className="h-full"
          style={{
            width: `${v}%`,
            background: `linear-gradient(90deg, #0ea5e9, ${color})`,
          }}
        />
      </div>
    </div>
  );
}
