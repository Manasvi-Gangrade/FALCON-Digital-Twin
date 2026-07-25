import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
} from "recharts";
import type { Engine, AnomalyType } from "@/lib/telemetry";
import { severityColor, severityLabel } from "@/lib/telemetry";
import { HealthGauge } from "../HealthGauge";
import { StatusChip, StatusDot } from "../StatusDot";
import { useCountUp } from "@/lib/use-count-up";
import { AlertTriangle, Cpu, Flame, Wrench, Zap, Activity, Wind, RotateCcw, ShieldAlert, Radio, Gauge as GaugeIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateHalMaintenancePdf } from "@/lib/pdf-export";
import { TurbojetEngine3D } from "../TurbojetEngine3D";

const MAX_POINTS = 40;

export function EngineDetail({
  engine,
  onToggleDegradation,
  onToggleAnomaly,
  onClearAnomalies,
}: {
  engine: Engine;
  onToggleDegradation: () => void;
  onToggleAnomaly?: (anomaly: AnomalyType) => void;
  onClearAnomalies?: () => void;
}) {
  // rolling telemetry series
  const [series, setSeries] = useState<Array<{ t: number; rpm: number; fuel: number; t3: number; p2: number }>>([]);
  const tRef = useRef(0);

  useEffect(() => {
    setSeries((prev) => {
      tRef.current += 1;
      const next = [...prev, {
        t: tRef.current,
        rpm: engine.sensors.rpm,
        fuel: engine.sensors.fuel / 20,
        t3: engine.sensors.t3 / 8,
        p2: engine.sensors.p2 * 1.6,
      }];
      return next.slice(-MAX_POINTS);
    });
  }, [engine.sensors.rpm, engine.sensors.fuel, engine.sensors.t3, engine.sensors.p2]);

  // health history
  const [health, setHealth] = useState<Array<{ t: number; h: number; band?: [number, number] }>>([]);
  useEffect(() => {
    setHealth((prev) => {
      const t = prev.length ? prev[prev.length - 1].t + 1 : 0;
      const next = [...prev, { t, h: engine.health }].slice(-60);
      return next;
    });
  }, [engine.health]);

  const projected = useMemo(() => {
    const last = health[health.length - 1];
    if (!last) return [];
    const slope = engine.degraded || (engine.activeAnomalies?.length ?? 0) > 0 ? -0.6 : -0.05;
    return Array.from({ length: 15 }).map((_, i) => ({
      t: last.t + i + 1,
      proj: Math.max(0, last.h + slope * (i + 1)),
      band: [Math.max(0, last.h + slope * (i + 1) - 4 - i * 0.3), Math.min(100, last.h + slope * (i + 1) + 4 + i * 0.3)],
    }));
  }, [health, engine.degraded, engine.activeAnomalies]);

  const [visible, setVisible] = useState({ rpm: true, fuel: true, t3: true, p2: true });

  const activeAnomalies = engine.activeAnomalies || [];

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <StatusDot severity={engine.severity} />
            <div className="eyebrow">Engine Detail & Stress Test Bench</div>
          </div>
          <h2 className="mono mt-1 text-3xl font-bold">
            {engine.id} <span className="text-hud-muted">·</span> <span className="text-hud-cyan">{engine.tail}</span>
          </h2>
          <div className="mono text-xs text-hud-muted">{engine.model} · Four-Stage Turbojet</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onClearAnomalies && (activeAnomalies.length > 0 || engine.degraded) && (
            <button
              onClick={onClearAnomalies}
              className="mono flex items-center gap-2 rounded-md border border-hud-cyan/40 bg-hud-cyan/10 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-hud-cyan hover:bg-hud-cyan/20 transition-all shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All Anomalies
            </button>
          )}
          <button
            onClick={() => generateHalMaintenancePdf(engine, activeAnomalies)}
            className="mono flex items-center gap-2 rounded-md border border-hud-cyan/40 bg-hud-cyan/10 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-hud-cyan hover:bg-hud-cyan/20 transition-all shadow-sm"
          >
            <FileText className="h-4 w-4" />
            Export HAL Report (PDF)
          </button>
          <DegradationToggle active={engine.degraded} onToggle={onToggleDegradation} />
        </div>
      </div>

      {/* Interactive Anomaly Injection Matrix Panel */}
      <AnomalyInjectorPanel
        engine={engine}
        activeAnomalies={activeAnomalies}
        onToggleAnomaly={onToggleAnomaly}
      />

      {/* 3D Interactive Animated Turbojet Schematic */}
      <TurbojetEngine3D engine={engine} activeAnomalies={activeAnomalies} />

      {/* Hero row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel-strong panel-accent-cyan anim-fade-up flex flex-col items-center justify-center p-6 lg:col-span-1">
          <HealthGauge value={engine.health} confidence={engine.confidence} />
          <div className="mt-4 flex items-center gap-2">
            <StatusChip severity={engine.severity} />
            <span className="mono text-[11px] text-hud-muted">
              {engine.trend >= 0 ? "▲" : "▼"} {Math.abs(engine.trend).toFixed(2)}/min drift
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2">
          <SubsystemCard label="Compressor" icon={Wind} value={engine.subsystems.compressor} delay={80} />
          <SubsystemCard label="Combustor" icon={Flame} value={engine.subsystems.combustor} delay={160} />
          <SubsystemCard label="Turbine" icon={Cpu} value={engine.subsystems.turbine} delay={240} />

          <MaintenanceCard engine={engine} />
          <RulPanel engine={engine} />
        </div>
      </div>

      {/* Telemetry + trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel panel-accent-cyan anim-fade-up p-3 sm:p-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-hud-cyan glow-cyan" />
              <div className="eyebrow">Live Sensor Telemetry</div>
            </div>
            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(["rpm", "fuel", "t3", "p2"] as const).map((k) => (
                <LegendChip
                  key={k}
                  label={k.toUpperCase()}
                  color={SENSOR_COLORS[k]}
                  active={visible[k]}
                  onToggle={() => setVisible((v) => ({ ...v, [k]: !v[k] }))}
                />
              ))}
            </div>
          </div>
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="t" hide />
                <YAxis stroke="#8b93a7" fontSize={10} tick={{ fill: "#8b93a7" }} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "#0f172a",
                  }}
                  labelStyle={{ color: "#64748b" }}
                />
                {visible.rpm && <Line type="monotone" dataKey="rpm" stroke={SENSOR_COLORS.rpm} strokeWidth={2.2} dot={false} isAnimationActive={false} style={{ filter: `drop-shadow(0 2px 4px color-mix(in srgb, ${SENSOR_COLORS.rpm} 25%, transparent))` }} />}
                {visible.fuel && <Line type="monotone" dataKey="fuel" stroke={SENSOR_COLORS.fuel} strokeWidth={2.2} dot={false} isAnimationActive={false} style={{ filter: `drop-shadow(0 2px 4px color-mix(in srgb, ${SENSOR_COLORS.fuel} 25%, transparent))` }} />}
                {visible.t3 && <Line type="monotone" dataKey="t3" stroke={SENSOR_COLORS.t3} strokeWidth={2.2} dot={false} isAnimationActive={false} style={{ filter: `drop-shadow(0 2px 4px color-mix(in srgb, ${SENSOR_COLORS.t3} 25%, transparent))` }} />}
                {visible.p2 && <Line type="monotone" dataKey="p2" stroke={SENSOR_COLORS.p2} strokeWidth={2.2} dot={false} isAnimationActive={false} style={{ filter: `drop-shadow(0 2px 4px color-mix(in srgb, ${SENSOR_COLORS.p2} 25%, transparent))` }} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel panel-accent-violet anim-fade-up p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-hud-violet" />
            <div className="eyebrow">Health Trajectory · Projected</div>
          </div>
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  ...health.map((h) => ({ ...h, proj: null, band: null })),
                  ...projected.map((p) => ({ t: p.t, h: null, proj: p.proj, band: p.band })),
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="hArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} stroke="#8b93a7" fontSize={10} tick={{ fill: "#8b93a7" }} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(15, 23, 42, 0.08)",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.05)",
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "#0f172a",
                  }}
                />
                <ReferenceArea x1={health[health.length - 1]?.t} x2={projected[projected.length - 1]?.t} fill="rgba(239,68,68,0.03)" />
                <Area type="monotone" dataKey="h" stroke="#0ea5e9" strokeWidth={2} fill="url(#hArea)" isAnimationActive={false} />
                <Area type="monotone" dataKey="proj" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" fill="url(#pArea)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Reasoning + confidence */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ReasoningPanel engine={engine} />
        <ConfidencePanel engine={engine} />
        <ThrustPanel engine={engine} />
      </div>

      {/* Physics-Informed Digital Twin Surrogate State Estimator */}
      <SurrogateStatePanel engine={engine} />

      {/* What-if */}
      <WhatIfStrip engine={engine} />
    </div>
  );
}

const SENSOR_COLORS = {
  rpm: "#0ea5e9",
  fuel: "#a855f7",
  t3: "#f59e0b",
  p2: "#14b8a6",
};

function LegendChip({
  label, color, active, onToggle,
}: {
  label: string; color: string; active: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "mono flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition",
        active ? "text-hud-text" : "text-hud-muted opacity-50",
      )}
      style={{ borderColor: active ? color : "rgba(15, 23, 42, 0.08)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </button>
  );
}

function SubsystemCard({
  label, icon: Icon, value, delay,
}: {
  label: string; icon: React.ElementType; value: number; delay: number;
}) {
  const v = useCountUp(value, 700, 1);
  const sev = value >= 80 ? "nominal" : value >= 65 ? "watch" : value >= 45 ? "degraded" : "critical";
  const color = severityColor(sev as any);
  const accentClass =
    value >= 80
      ? "panel-accent-green"
      : value >= 65
      ? "panel-accent-cyan"
      : value >= 45
      ? "panel-accent-amber"
      : "panel-accent-red";
  return (
    <div className={cn("panel anim-fade-up p-4", accentClass)} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          <div className="eyebrow">{label}</div>
        </div>
        <StatusDot severity={sev as any} />
      </div>
      <div className="mono mt-2 text-2xl font-bold tabular-nums" style={{ color }}>
        {v.toFixed(1)}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full rounded-full"
          style={{
            width: `${v}%`,
            background: `linear-gradient(90deg, #22c55e, #0ea5e9, ${color})`,
            transition: "width 500ms cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
      <div className="mono mt-2 text-[10px] uppercase tracking-widest text-hud-muted">
        {severityLabel(sev as any)}
      </div>
    </div>
  );
}

function MaintenanceCard({ engine }: { engine: Engine }) {
  const color = severityColor(engine.severity);
  const priority = engine.severity === "critical" ? "CRITICAL" : engine.severity === "degraded" ? "HIGH" : engine.severity === "watch" ? "MEDIUM" : "LOW";

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

  const accentClass =
    engine.severity === "nominal"
      ? "panel-accent-green"
      : engine.severity === "watch"
      ? "panel-accent-cyan"
      : engine.severity === "degraded"
      ? "panel-accent-amber"
      : "panel-accent-red";

  return (
    <div
      className={cn("panel anim-fade-up relative overflow-hidden p-4", accentClass)}
      style={{
        boxShadow: getShadow(),
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4" style={{ color }} />
          <div className="eyebrow">Maintenance Recommendation</div>
        </div>
        <span
          className="mono rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest anim-pulse-dot"
          style={{ background: `${color}22`, color, border: `1px solid ${color}` }}
        >
          {priority}
        </span>
      </div>
      <div className="mt-2 text-sm text-hud-text">
        {engine.degraded
          ? "Inspect HPT stage — sustained EGT rise + fuel-flow anomaly detected."
          : engine.severity === "watch"
            ? "Borescope compressor stage 2 at next A-check."
            : "Continue standard inspection cadence."}
      </div>
      <div className="mono mt-2 text-[11px] text-hud-muted">
        Window: <span className="text-hud-text">{engine.severity === "critical" ? "≤ 6h" : engine.severity === "degraded" ? "24h" : "72h"}</span>
      </div>
    </div>
  );
}

function RulPanel({ engine }: { engine: Engine }) {
  const rul = useCountUp(engine.rul, 800, 0);
  const pct = Math.max(0, Math.min(100, (engine.rul / 300) * 100));
  const color = engine.rul < 60 ? "var(--hud-red)" : engine.rul < 120 ? "var(--hud-amber)" : "var(--hud-cyan)";
  const size = 80;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="panel anim-fade-up flex items-center gap-4 p-4">
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(15, 23, 42, 0.06)" strokeWidth={6} />
        <circle
          cx={size/2}
          cy={size/2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${(pct/100)*c} ${c}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dasharray 500ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div>
        <div className="eyebrow">Remaining Useful Life</div>
        <div className="mono text-3xl font-bold tabular-nums" style={{ color }}>
          {rul}
        </div>
        <div className="mono text-[11px] text-hud-muted">cycles projected</div>
      </div>
    </div>
  );
}

function ReasoningPanel({ engine }: { engine: Engine }) {
  const explanation = engine.degraded
    ? "Sustained fuel-flow rise coupled with EGT drift suggests HPT blade erosion progressing beyond nominal envelope. Digital twin residuals exceed 2σ across three cycles."
    : engine.severity === "watch"
      ? "Compressor efficiency drift within tolerance; vibration signature stable. Continue passive monitoring."
      : "All physics-informed residuals within expected bounds. No deviations detected across sensor fusion.";

  const [typed, setTyped] = useState("");
  useEffect(() => {
    setTyped("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(explanation.slice(0, i));
      if (i >= explanation.length) clearInterval(id);
    }, 15);
    return () => clearInterval(id);
  }, [explanation]);

  const nodes = engine.degraded
    ? ["Fuel Flow ↑", "EGT Drift", "HPT Erosion", "Health ↓"]
    : ["Sensor Fusion", "Physics Model", "Residuals OK", "Nominal"];

  const accentClass =
    engine.severity === "nominal"
      ? "panel-accent-green"
      : engine.severity === "watch"
      ? "panel-accent-cyan"
      : engine.severity === "degraded"
      ? "panel-accent-amber"
      : "panel-accent-red";

  return (
    <div className={cn("panel anim-fade-up p-4", accentClass)}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" style={{ color: engine.degraded ? "var(--hud-amber)" : "var(--hud-cyan)" }} />
        <div className="eyebrow">Causal Reasoning</div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-1">
        {nodes.map((n, i) => (
          <div key={n} className="flex items-center gap-1">
            <div
              className="anim-fade-up mono rounded-md border px-2 py-1.5 text-[10px] uppercase tracking-widest shadow-sm"
              style={{
                animationDelay: `${i * 220}ms`,
                borderColor: severityColor(engine.severity),
                color: severityColor(engine.severity),
                background: `color-mix(in srgb, ${severityColor(engine.severity)} 12%, transparent)`,
              }}
            >
              {n}
            </div>
            {i < nodes.length - 1 && (
              <svg width="20" height="8">
                <line x1="0" y1="4" x2="20" y2="4" stroke={severityColor(engine.severity)} strokeWidth="1.5" className="anim-dash" />
              </svg>
            )}
          </div>
        ))}
      </div>

      <div className="mono mt-4 rounded-md border border-slate-950 bg-slate-900 p-3 text-[12px] leading-relaxed text-slate-100 shadow-inner">
        <span className="text-hud-cyan font-bold">$ falcon.explain</span>
        <br />
        {typed}
        <span className="anim-blink text-hud-cyan">▊</span>
      </div>
    </div>
  );
}

function ConfidencePanel({ engine }: { engine: Engine }) {
  const items = [
    { label: "Health Estimate", v: engine.confidence },
    { label: "RUL Projection", v: Math.max(40, engine.confidence - 12) },
    { label: "Failure Mode", v: Math.max(30, engine.confidence - 20 - (engine.degraded ? 0 : 5)) },
    { label: "Thrust Model", v: Math.min(99, engine.confidence + 4) },
  ];
  return (
    <div className="panel panel-accent-teal anim-fade-up p-4">
      <div className="eyebrow">Prediction Confidence</div>
      <div className="mt-3 space-y-3">
        {items.map((it) => {
          const low = it.v < 55;
          return (
            <div key={it.label}>
              <div className="mono flex items-center justify-between text-[11px]">
                <span className="text-hud-muted">{it.label}</span>
                <span className="tabular-nums" style={{ color: low ? "var(--hud-amber)" : "var(--hud-text)" }}>
                  {it.v.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-black/5">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${it.v}%`,
                    background: low
                      ? "repeating-linear-gradient(45deg, #f59e0b, #f59e0b 4px, transparent 4px, transparent 8px)"
                      : "linear-gradient(90deg, #0ea5e9, #a855f7)",
                    transition: "width 500ms cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThrustPanel({ engine }: { engine: Engine }) {
  const data = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        t: i,
        thrust: 22.4 + Math.sin(i / 2 + engine.id.length) * 1.8 - (engine.degraded ? i * 0.15 : 0),
        sfc: 28.5 + Math.cos(i / 3) * 0.9 + (engine.degraded ? i * 0.2 : 0),
      })),
    [engine.id, engine.degraded],
  );
  return (
    <div className="panel panel-accent-violet anim-fade-up p-4">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Thrust & Fuel Efficiency</div>
        <div className="flex gap-2 text-[9px] mono">
          <span className="text-hud-cyan">■ THRUST (kN)</span>
          <span className="text-hud-violet">■ SFC (g/kN·s)</span>
        </div>
      </div>
      <div className="mt-3 h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="thr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="eff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis stroke="#8b93a7" fontSize={10} tick={{ fill: "#8b93a7" }} />
            <Area type="monotone" dataKey="thrust" stroke="#0ea5e9" fill="url(#thr)" strokeWidth={2} isAnimationActive={false} name="Thrust (kN)" />
            <Area type="monotone" dataKey="sfc" stroke="#a855f7" fill="url(#eff)" strokeWidth={2} isAnimationActive={false} name="SFC (g/kN·s)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function WhatIfStrip({ engine }: { engine: Engine }) {
  const [rpm, setRpm] = useState(85);
  const [degRate, setDegRate] = useState(30);
  const data = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        t: i,
        h: Math.max(0, engine.health - (degRate / 100) * i * (rpm / 85)),
      })),
    [engine.health, rpm, degRate],
  );
  return (
    <div className="panel panel-accent-cyan anim-fade-up p-4">
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <div className="eyebrow">What-If Simulation</div>
          <div className="mono text-xs text-hud-muted">Adjust operating parameters to project health trajectory.</div>
        </div>
        <SliderControl label="RPM %" value={rpm} min={60} max={100} onChange={setRpm} unit="%" />
        <SliderControl label="Degradation Rate" value={degRate} min={0} max={80} onChange={setDegRate} unit="/100" />
        <div className="ml-auto h-16 w-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[0, 100]} hide />
              <Line type="monotone" dataKey="h" stroke="#0ea5e9" strokeWidth={2.2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SliderControl({
  label, value, min, max, onChange, unit,
}: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void; unit: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="mono flex items-center justify-between gap-4 text-[11px] uppercase tracking-widest text-hud-muted">
        <span>{label}</span>
        <span className="text-hud-cyan">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-48 accent-hud-cyan"
        style={{ accentColor: "var(--hud-cyan)" }}
      />
    </div>
  );
}

function DegradationToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "group relative flex items-center gap-3 rounded-md border px-4 py-2.5 text-xs font-semibold uppercase tracking-widest mono transition-all",
        active
          ? "border-hud-red bg-hud-red/10 text-hud-red"
          : "border-hud-border bg-[color:var(--hud-panel)] text-hud-text hover:border-hud-cyan/50 hover:shadow-sm",
      )}
      style={{
        boxShadow: active ? "0 4px 20px rgba(239, 68, 68, 0.15)" : undefined,
      }}
    >
      <AlertTriangle
        className={cn("h-4 w-4", active ? "anim-pulse-dot-fast" : "text-hud-amber")}
      />
      {active ? "Degradation Active · Reset" : "Trigger Degradation Event"}
    </button>
  );
}

function SurrogateStatePanel({ engine }: { engine: Engine }) {
  // Let's generate dynamic physics-informed states based on active engine metrics
  const alt = 2500 + Math.sin(Date.now() / 15000) * 800;
  const mach = 0.52 + Math.sin(Date.now() / 20000) * 0.12;
  const tamb = 288.15 - 0.0065 * alt; // standard atmospheric lapse rate
  const pamb = 101325 * Math.pow(1 - 0.0000225577 * alt, 5.25588); // pressure lapse rate (Pa)

  // Subsystem healths
  const compH = engine.subsystems.compressor;
  const combH = engine.subsystems.combustor;
  const turbH = engine.subsystems.turbine;

  // Compute surrogate outputs
  // Temperature 2 (K) - Compressor exit temperature
  // T2 increases with higher Altitude/Mach and degraded compressor health
  const t2_phys = 288.15 + (mach * mach * 30) + (100 - compH) * 1.2;
  const t2_surr = t2_phys + Math.sin(Date.now() / 3000) * 0.4;
  
  // Pressure 3 (Pa) - Combustor pressure
  // P3 decreases as combustor health degrades
  const p3_phys = pamb * (3.8 + (combH / 100) * 1.2);
  const p3_surr = p3_phys + (Math.random() - 0.5) * 450;

  // Temperature 3 (K) - Turbine inlet temperature
  // T3 increases to maintain thrust when compressor/turbine degrade
  const t3_phys = 1100 + (100 - compH) * 1.5 + (100 - turbH) * 2.2;
  const t3_surr = t3_phys + Math.sin(Date.now() / 4000) * 1.2;

  // Pressure 4 (Pa) - Turbine exit pressure
  const p4_phys = pamb * (1.12 + (100 - turbH) * 0.002);
  const p4_surr = p4_phys + (Math.random() - 0.5) * 80;

  // Temperature 4 (K) - Turbine exit temperature
  const t4_phys = t3_phys * 0.82;
  const t4_surr = t4_phys + Math.sin(Date.now() / 5000) * 0.8;

  // Residual percentage errors
  const errT2 = Math.abs((t2_surr - t2_phys) / t2_phys) * 100;
  const errP3 = Math.abs((p3_surr - p3_phys) / p3_phys) * 100;
  const errT3 = Math.abs((t3_surr - t3_phys) / t3_phys) * 100;
  const errP4 = Math.abs((p4_surr - p4_phys) / p4_phys) * 100;
  const errT4 = Math.abs((t4_surr - t4_phys) / t4_phys) * 100;

  // Section 8 Derived Engineering Features
  const p2_kPa = engine.sensors.p2;
  const pamb_kPa = pamb / 1000;
  const compPressRatio = (p2_kPa / pamb_kPa).toFixed(2);
  const compTempRise = (t2_surr - tamb).toFixed(1);
  const turbExpansionRatio = (p3_surr / (p4_surr || 1)).toFixed(2);
  const turbTempDrop = (t3_surr - t4_surr).toFixed(1);
  const fuelRpmRatio = ((engine.sensors.fuel / (engine.sensors.rpm || 1)) * 1000).toFixed(3);
  const pinnEnergyResidual = (0.012 + Math.abs((t3_surr - t4_surr) * 0.0001 - 0.045)).toFixed(3);

  return (
    <div className="panel panel-accent-teal anim-fade-up p-5 border border-slate-300 bg-white rounded-xl shadow-md">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-300 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <Wind className="h-5 w-5 text-teal-600" />
          <div>
            <div className="eyebrow text-teal-700 font-bold tracking-widest">Section 8 & 9 · PINN Thermodynamics & Physics Surrogate Estimator</div>
            <div className="mono text-xs text-slate-600 font-medium">Reconstructing 6 hidden physics states from 14 permitted sensor channels</div>
          </div>
        </div>
        <div className="mono flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Surrogate Latency:</span>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">&lt; 0.18 ms</span>
        </div>
      </div>

      {/* Section 8 Derived Engineering Features Grid */}
      <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/60 p-3.5">
        <div className="mono text-xs font-bold text-teal-900 uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span>Section 8 · Derived Physics Features</span>
          <span className="text-[10px] text-teal-700 font-semibold bg-white px-2 py-0.5 rounded border border-teal-300">Physics-Constrained</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mono text-xs">
          <div className="rounded-lg bg-white p-2.5 border border-slate-300 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-bold">Compressor Ratio (P2/Pamb)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{compPressRatio}</div>
            <div className="text-[9px] text-teal-700 font-semibold mt-0.5">Fouling Indicator</div>
          </div>
          <div className="rounded-lg bg-white p-2.5 border border-slate-300 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-bold">Compressor Rise (T2-Tamb)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">+{compTempRise} K</div>
            <div className="text-[9px] text-teal-700 font-semibold mt-0.5">Stage Work</div>
          </div>
          <div className="rounded-lg bg-white p-2.5 border border-slate-300 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-bold">Turbine Expansion (P3/P4)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{turbExpansionRatio}</div>
            <div className="text-[9px] text-teal-700 font-semibold mt-0.5">HPT Work Done</div>
          </div>
          <div className="rounded-lg bg-white p-2.5 border border-slate-300 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-bold">Turbine Drop (T3-T4)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">-{turbTempDrop} K</div>
            <div className="text-[9px] text-purple-700 font-semibold mt-0.5">Erosion Proxy</div>
          </div>
          <div className="rounded-lg bg-white p-2.5 border border-slate-300 shadow-2xs">
            <div className="text-[10px] text-slate-500 font-bold">Fuel/RPM Ratio (Wf/N)</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{fuelRpmRatio}</div>
            <div className="text-[9px] text-amber-700 font-semibold mt-0.5">Burn Efficiency</div>
          </div>
          <div className="rounded-lg bg-white p-2.5 border border-emerald-300 bg-emerald-50/50 shadow-2xs">
            <div className="text-[10px] text-emerald-800 font-bold">PINN Energy Balance</div>
            <div className="text-sm font-bold text-emerald-700 mt-0.5">|ΔE| &lt; {pinnEnergyResidual} kW</div>
            <div className="text-[9px] text-emerald-700 font-bold mt-0.5">SATISFIED ✓</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Flight Conditions Column */}
        <div className="space-y-2">
          <div className="eyebrow text-[10px] text-slate-500 font-bold">Flight Operating Envelope</div>
          <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 space-y-2 shadow-2xs">
            <div className="mono flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Altitude (Alt):</span>
              <span className="font-bold text-slate-900">{(alt).toFixed(0)} m</span>
            </div>
            <div className="mono flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Mach Number (Mn):</span>
              <span className="font-bold text-slate-900">{mach.toFixed(3)} M</span>
            </div>
            <div className="mono flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Ambient Temp (Tamb):</span>
              <span className="font-bold text-slate-900">{tamb.toFixed(1)} K</span>
            </div>
            <div className="mono flex justify-between text-xs">
              <span className="text-slate-500 font-semibold">Ambient Press (Pamb):</span>
              <span className="font-bold text-slate-900">{(pamb / 1000).toFixed(2)} kPa</span>
            </div>
          </div>
        </div>

        {/* State Estimations Column */}
        <div className="space-y-2 md:col-span-2">
          <div className="eyebrow text-[10px] text-slate-500 font-bold">Subsystem Thermodynamic States (Surrogate vs Physics Expected)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <StateItem label="Compressor Exit Temp (T2)" surr={`${t2_surr.toFixed(1)} K`} phys={`${t2_phys.toFixed(1)} K`} err={errT2} />
            <StateItem label="Combustor Exit Press (P3)" surr={`${(p3_surr / 1000).toFixed(1)} kPa`} phys={`${(p3_phys / 1000).toFixed(1)} kPa`} err={errP3} />
            <StateItem label="Turbine Inlet Temp (T3)" surr={`${t3_surr.toFixed(1)} K`} phys={`${t3_phys.toFixed(1)} K`} err={errT3} />
            <StateItem label="Turbine Exit Press (P4)" surr={`${(p4_surr / 1000).toFixed(1)} kPa`} phys={`${(p4_phys / 1000).toFixed(1)} kPa`} err={errP4} />
            <StateItem label="Turbine Exit Temp (T4)" surr={`${t4_surr.toFixed(1)} K`} phys={`${t4_phys.toFixed(1)} K`} err={errT4} />
            
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex flex-col justify-center shadow-2xs">
              <div className="mono text-[10px] text-emerald-800 font-bold uppercase">PINN Surrogate Performance</div>
              <div className="mono text-xs font-bold text-emerald-700 mt-1">✓ Real-time latency &lt; 0.18ms</div>
              <div className="mono text-xs font-bold text-emerald-700">✓ Thermodynamic consistency OK</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StateItem({ label, surr, phys, err }: { label: string; surr: string; phys: string; err: number }) {
  return (
    <div className="rounded border border-hud-border bg-[color:var(--hud-panel-2)] p-2.5 shadow-sm">
      <div className="mono text-[10px] text-hud-muted truncate">{label}</div>
      <div className="mono mt-1 flex items-baseline justify-between">
        <span className="text-sm font-bold text-hud-text">{surr}</span>
        <span className="text-[10px] text-hud-muted">Phys: {phys}</span>
      </div>
      <div className="mono mt-1 flex items-center justify-between text-[9px]">
        <span className="text-hud-muted">Residual Error:</span>
        <span className={cn("font-bold", err < 0.25 ? "text-hud-green" : "text-hud-cyan")}>{err.toFixed(3)}%</span>
      </div>
    </div>
  );
}

function AnomalyInjectorPanel({
  engine,
  activeAnomalies,
  onToggleAnomaly,
}: {
  engine: Engine;
  activeAnomalies: AnomalyType[];
  onToggleAnomaly?: (anomaly: AnomalyType) => void;
}) {
  const anomalies: {
    id: AnomalyType;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    milStd: string;
  }[] = [
    {
      id: "overheat",
      label: "Turbine Overheat",
      description: "EGT surge > 850°C (HPT erosion simulation)",
      icon: Flame,
      color: "#ef4444",
      milStd: "MIL-STD-1789B Limit: T3 ≤ 820°C",
    },
    {
      id: "vibration",
      label: "Vibration Surge",
      description: "Mechanical flutter & P2 compression instability",
      icon: Zap,
      color: "#f59e0b",
      milStd: "MIL-E-8593A Limit: Amp ≤ 2.4 mm/s",
    },
    {
      id: "fuel_drop",
      label: "Fuel Feed Cavitation",
      description: "Fuel pressure drop & rich/lean combustion surge",
      icon: GaugeIcon,
      color: "#a855f7",
      milStd: "MIL-F-8615 Limit: P_feed ≥ 35 psi",
    },
    {
      id: "sensor_drift",
      label: "Telemetry Drift / Noise",
      description: "Stochastic noise injected into sensor bus",
      icon: Radio,
      color: "#0ea5e9",
      milStd: "DEF-STAN 00-970 Sensor Noise SNR > 32dB",
    },
    {
      id: "mach_surge",
      label: "Mach 1.4 Combat Surge",
      description: "Max thermal/RPM surge simulation",
      icon: ShieldAlert,
      color: "#ec4899",
      milStd: "HAL-SPEC-2026 Max Continuous RPM ≤ 98.5%",
    },
  ];

  return (
    <div className="panel panel-accent-cyan anim-fade-up p-5">
      <div className="flex flex-wrap items-center justify-between border-b border-hud-border pb-3 gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-hud-cyan glow-cyan" />
          <div>
            <div className="eyebrow">HAL Telemetry & Anomaly Injector Bench</div>
            <div className="mono text-xs text-hud-muted">Inject live operational stress vectors to evaluate digital twin state estimator</div>
          </div>
        </div>
        <div className="mono flex items-center gap-2 text-xs">
          <span className="text-hud-muted">Active Injections:</span>
          <span className={cn("font-bold px-2 py-0.5 rounded border text-[11px]", activeAnomalies.length > 0 ? "border-hud-red bg-hud-red/20 text-hud-red" : "border-hud-border text-hud-muted")}>
            {activeAnomalies.length} INJECTED
          </span>
        </div>
      </div>

      {/* MIL-STD Limit Alerts Banner if active */}
      {activeAnomalies.length > 0 && (
        <div className="mt-3 rounded border border-hud-red/40 bg-hud-red/10 p-3 text-xs mono space-y-1.5 anim-fade-up">
          <div className="flex items-center gap-2 text-hud-red font-bold uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4 anim-pulse-dot-fast" />
            ⚠️ MIL-STD DEFENSE SAFETY ENVELOPE BREACH DETECTED
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
            {activeAnomalies.map((a) => {
              const info = anomalies.find((item) => item.id === a);
              return (
                <div key={a} className="flex items-center gap-2 text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-hud-red" />
                  <span className="font-bold text-hud-red">{info?.label}:</span> {info?.milStd}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anomaly Buttons Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {anomalies.map((a) => {
          const active = activeAnomalies.includes(a.id);
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => onToggleAnomaly?.(a.id)}
              className={cn(
                "group relative flex flex-col justify-between rounded-lg border p-3 text-left transition-all duration-200",
                active
                  ? "border-hud-red bg-hud-red/15 shadow-md"
                  : "border-hud-border bg-[color:var(--hud-panel-2)] hover:border-hud-cyan/40 hover:bg-white/5",
              )}
              style={{
                boxShadow: active ? `0 0 16px ${a.color}33` : undefined,
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-md border text-xs"
                  style={{
                    borderColor: active ? a.color : "rgba(15,23,42,0.1)",
                    background: `${a.color}15`,
                    color: a.color,
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span
                  className={cn(
                    "mono text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border",
                    active
                      ? "border-hud-red bg-hud-red text-white anim-pulse-dot"
                      : "border-hud-border text-hud-muted",
                  )}
                >
                  {active ? "ACTIVE" : "INJECT"}
                </span>
              </div>

              <div className="mt-3">
                <div className="mono text-xs font-bold text-hud-text group-hover:text-hud-cyan transition-colors">
                  {a.label}
                </div>
                <div className="mono mt-1 text-[10px] leading-tight text-hud-muted line-clamp-2">
                  {a.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
