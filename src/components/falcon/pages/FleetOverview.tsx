import { useMemo } from "react";
import type { Engine } from "@/lib/telemetry";
import { severityColor, severityOf } from "@/lib/telemetry";
import { StatusChip, StatusDot } from "../StatusDot";
import { useCountUp } from "@/lib/use-count-up";
import { TrendingDown, TrendingUp, Plane, Gauge as GaugeIcon, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { RadarFleetMap } from "../RadarFleetMap";

export function FleetOverview({
  engines,
  onSelectEngine,
}: {
  engines: Engine[];
  onSelectEngine: (id: string) => void;
}) {
  const avgHealth = engines.reduce((a, e) => a + e.health, 0) / engines.length;
  const avgConf = engines.reduce((a, e) => a + e.confidence, 0) / engines.length;
  const needAttn = engines.filter((e) => e.severity === "degraded" || e.severity === "critical").length;
  const fleetSev = severityOf(avgHealth);

  return (
    <div className="space-y-5">
      {/* Live Defense Telemetry Ticker */}
      <div className="overflow-hidden rounded-xl border border-sky-500/30 bg-[#0f172a] py-2 px-3.5 shadow-inner font-mono text-[11px] text-sky-300 flex items-center gap-3">
        <div className="flex items-center gap-1.5 shrink-0 bg-sky-500/20 px-2.5 py-0.5 rounded-md text-sky-300 font-bold uppercase tracking-wider text-[10px] border border-sky-400/30">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          LIVE STREAM
        </div>
        <div className="truncate text-slate-300 font-mono tracking-wide text-xs">
          <span className="text-sky-400 font-bold">ALT:</span> 8,500m &nbsp;•&nbsp; 
          <span className="text-sky-400 font-bold">MACH:</span> 0.82 &nbsp;•&nbsp; 
          <span className="text-sky-400 font-bold">RPM:</span> 12,500 &nbsp;•&nbsp; 
          <span className="text-sky-400 font-bold">P2/Pamb:</span> 1.22 &nbsp;•&nbsp; 
          <span className="text-sky-400 font-bold">T3 TURBINE:</span> 1,120K &nbsp;•&nbsp; 
          <span className="text-emerald-400 font-bold">PINN ERROR:</span> &lt;0.018 kW (BOUND ✓) &nbsp;•&nbsp; 
          <span className="text-amber-300 font-bold">MIL-STD:</span> COMPLIANT
        </div>
      </div>

      <Hero fleetSev={fleetSev} engineCount={engines.length} needAttn={needAttn} />

      <KpiStrip
        items={[
          { label: "Engines Monitored", value: engines.length, icon: Plane, color: "var(--hud-cyan)" },
          { label: "Fleet Avg Health", value: avgHealth, decimals: 1, unit: "", icon: GaugeIcon, color: severityColor(fleetSev) },
          { label: "Needing Attention", value: needAttn, icon: TrendingDown, color: needAttn ? "var(--hud-amber)" : "var(--hud-green)" },
          { label: "Avg Confidence", value: avgConf, decimals: 0, unit: "%", icon: ShieldCheck, color: "var(--hud-violet)" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="eyebrow mb-3">Fleet Roster</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {engines.map((e, i) => (
              <EngineCard
                key={e.id}
                engine={e}
                onClick={() => onSelectEngine(e.id)}
                delay={i * 70}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <RadarFleetMap engines={engines} onSelectEngine={onSelectEngine} />
        </div>
      </div>
    </div>
  );
}

function Hero({ fleetSev, engineCount, needAttn }: { fleetSev: any; engineCount: number; needAttn: number }) {
  return (
    <div className="panel-strong panel-accent-cyan relative overflow-hidden px-4 sm:px-8 py-6 sm:py-8">
      {/* animated schematic */}
      <svg className="pointer-events-none absolute -right-10 top-0 h-full opacity-20 sm:opacity-30 hidden sm:block" width="520" height="220" viewBox="0 0 520 220">
        <defs>
          <linearGradient id="turbineG" x1="0" x2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
            <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 30 }).map((_, i) => (
          <line
            key={i}
            x1={i * 18}
            y1={110 - Math.sin(i / 3) * 40}
            x2={i * 18 + 10}
            y2={110 - Math.sin((i + 1) / 3) * 40}
            stroke="url(#turbineG)"
            strokeWidth="1.5"
          />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <circle key={i} cx={80 + i * 70} cy={110} r={40 - i * 3} fill="none" stroke="rgba(14,165,233,0.08)" />
        ))}
      </svg>

      <div className="relative z-10 max-w-2xl">
        <div className="flex items-center gap-2">
          <StatusDot severity={fleetSev} />
          <span className="eyebrow truncate">FALCON · Aeroengine Component & Operational Network</span>
        </div>
        <h1 className="mono mt-2 sm:mt-3 text-2xl sm:text-4xl font-bold tracking-tight text-hud-text">
          FALCON <span className="text-hud-cyan">Digital Twin</span>
        </h1>
        <p className="mt-2 max-w-lg text-xs sm:text-sm text-hud-muted">
          Physics-informed, real-time health monitoring for the four-stage turbojet fleet. Monitoring
          <span className="mono text-hud-text"> {engineCount} </span>
          engines · <span className="mono text-hud-amber">{needAttn}</span> flagged for review.
        </p>
      </div>
    </div>
  );
}

function KpiStrip({
  items,
}: {
  items: { label: string; value: number; decimals?: number; unit?: string; icon: React.ElementType; color: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it, i) => (
        <Kpi key={it.label} {...it} delay={i * 80} />
      ))}
    </div>
  );
}

function Kpi({
  label,
  value,
  decimals = 0,
  unit = "",
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  icon: React.ElementType;
  color: string;
  delay: number;
}) {
  const v = useCountUp(value, 900, decimals);
  const accentClass =
    color === "var(--hud-green)"
      ? "panel-accent-green"
      : color === "var(--hud-amber)"
      ? "panel-accent-amber"
      : color === "var(--hud-cyan)"
      ? "panel-accent-cyan"
      : "panel-accent-violet";

  return (
    <div className={cn("panel anim-fade-up p-4", accentClass)} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div className="eyebrow">{label}</div>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="mono mt-2 text-3xl font-bold tabular-nums" style={{ color }}>
        {v.toFixed(decimals)}
        <span className="text-base text-hud-muted">{unit}</span>
      </div>
    </div>
  );
}

function EngineCard({
  engine,
  onClick,
  delay,
}: {
  engine: Engine;
  onClick: () => void;
  delay: number;
}) {
  const v = useCountUp(engine.health, 700, 1);
  const color = severityColor(engine.severity);
  const trending = engine.trend >= 0;
  const TrendIcon = trending ? TrendingUp : TrendingDown;

  // Ring
  const size = 92;
  const r = 40;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;

  // Define soft colored shadow based on severity
  const getShadow = () => {
    switch (engine.severity) {
      case "critical":
        return "0 4px 24px rgba(239, 68, 68, 0.12)";
      case "degraded":
        return "0 4px 20px rgba(245, 158, 11, 0.12)";
      case "watch":
        return "0 4px 20px rgba(14, 165, 233, 0.1)";
      default:
        return "0 4px 20px rgba(15, 23, 42, 0.05)";
    }
  };

  const severityAccentClass =
    engine.severity === "nominal"
      ? "panel-accent-green"
      : engine.severity === "watch"
      ? "panel-accent-cyan"
      : engine.severity === "degraded"
      ? "panel-accent-amber"
      : "panel-accent-red";

  return (
    <button
      onClick={onClick}
      className={cn(
        "panel anim-fade-up group relative overflow-hidden p-4 text-left transition-all hover:-translate-y-1 hover:shadow-lg",
        severityAccentClass
      )}
      style={{
        animationDelay: `${delay}ms`,
        boxShadow: getShadow(),
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at top, color-mix(in srgb, ${color} 10%, transparent), transparent 60%)` }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <div className="mono text-lg font-bold text-hud-text">{engine.id}</div>
          <div className="mono text-[10px] uppercase tracking-widest text-hud-muted">
            {engine.tail} · {engine.model}
          </div>
        </div>
        <StatusChip severity={engine.severity} />
      </div>

      <div className="relative mt-3 flex items-center gap-4">
        <svg width={size} height={size} className="shrink-0">
          <defs>
            <linearGradient id={`ring-${engine.id}`} x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="60%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth={7} />
          <circle
            cx={size/2}
            cy={size/2}
            r={r}
            fill="none"
            stroke={`url(#ring-${engine.id})`}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div>
          <div className="mono text-3xl font-bold tabular-nums" style={{ color }}>
            {v.toFixed(1)}
          </div>
          <div className="mono flex items-center gap-1 text-[11px] text-hud-muted">
            <TrendIcon className="h-3 w-3" style={{ color: trending ? "var(--hud-green)" : "var(--hud-amber)" }} />
            RUL {engine.rul.toFixed(0)} cyc
          </div>
        </div>
      </div>
    </button>
  );
}
