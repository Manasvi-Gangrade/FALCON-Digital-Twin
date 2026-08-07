import { useState } from "react";
import type { Engine, AnomalyType } from "@/lib/telemetry";
import { Flame, Wind, Cpu, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function TurbojetEngine3D({
  engine,
  activeAnomalies = [],
}: {
  engine: Engine;
  activeAnomalies?: AnomalyType[];
}) {
  const [activeStage, setActiveStage] = useState<"fan" | "compressor" | "combustor" | "turbine" | "exhaust">("compressor");

  const isOverheat = activeAnomalies.includes("overheat") || engine.subsystems.turbine < 70;
  const isVibration = activeAnomalies.includes("vibration") || engine.subsystems.compressor < 70;
  const isFuelDrop = activeAnomalies.includes("fuel_drop") || engine.subsystems.combustor < 70;

  return (
    <div className="panel panel-accent-cyan relative overflow-hidden bg-[#f0f4f8] border border-[#cbd5e1] p-4 sm:p-6 shadow-md rounded-xl text-slate-800">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-400/40 shadow-sm">
            <Zap className="h-5 w-5 text-sky-600 animate-pulse" />
          </div>
          <div>
            <div className="eyebrow text-sky-700 font-bold tracking-widest">Aerothon 2026 · Interactive Labeled Cutaway</div>
            <h3 className="mono text-lg font-bold text-slate-900 tracking-wide">
              Four-Stage Turbojet Subsystem Blueprint
            </h3>
            <p className="text-xs text-slate-600 font-sans mt-0.5">
              <strong>What this schematic shows:</strong> Interactive structural cutaway of single-spool 4-stage turbojet engine. Click on HPC Compressor, Combustor, HPT Turbine, or Exhaust Nozzle to inspect live thermal & pressure state.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mono text-xs">
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-700 shadow-sm">
            <span className="text-slate-500 font-semibold">Engine ID:</span>
            <span className="font-bold text-sky-700">{engine.id}</span>
          </div>
          <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 font-bold uppercase text-[11px] shadow-sm border", engine.health > 80 ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-rose-50 text-rose-700 border-rose-300")}>
            <span className={cn("h-2.5 w-2.5 rounded-full", engine.health > 80 ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-ping")} />
            {engine.severity} ({engine.health.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* SVG 3D Canvas with Clear Engineering Labels */}
      <div className="relative mt-4 rounded-xl border border-slate-300 bg-white p-4 sm:p-6 shadow-sm overflow-hidden">
        {/* Light Grid Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:24px_24px]" />

        <svg
          viewBox="0 0 1000 380"
          className="relative z-10 w-full max-h-[380px] object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="casing3DLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="40%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="fanBladeCyan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="compressorEmerald" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="combustorOrange" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            <linearGradient id="turbineViolet" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            <linearGradient id="thrustPlumeLight" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#0ea5e9" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>

            {/* Drop Shadow Filters */}
            <filter id="shadowGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0284c7" floodOpacity="0.3" />
            </filter>
            <filter id="shadowFire" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#ef4444" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* ================= CALLOUT POINTER LABELS (TOP) ================= */}
          {/* STAGE 1: INLET / FAN */}
          <g onClick={() => setActiveStage("fan")} className="cursor-pointer">
            <line x1="115" y1="135" x2="115" y2="70" stroke={activeStage === "fan" ? "#0284c7" : "#64748b"} strokeWidth={activeStage === "fan" ? "2.5" : "1.5"} strokeDasharray="3 3" />
            <circle cx="115" cy="135" r="4" fill="#0284c7" />
            <rect x="55" y="45" width="120" height="24" rx="6" fill={activeStage === "fan" ? "#0284c7" : "#e0f2fe"} stroke="#0284c7" strokeWidth="1.5" />
            <text x="115" y="61" fill={activeStage === "fan" ? "#ffffff" : "#0369a1"} fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
              1. FAN & INLET
            </text>
          </g>

          {/* STAGE 2: COMPRESSOR */}
          <g onClick={() => setActiveStage("compressor")} className="cursor-pointer">
            <line x1="310" y1="125" x2="310" y2="55" stroke={activeStage === "compressor" ? "#10b981" : "#64748b"} strokeWidth={activeStage === "compressor" ? "2.5" : "1.5"} strokeDasharray="3 3" />
            <circle cx="310" cy="125" r="4" fill={isVibration ? "#ef4444" : "#10b981"} />
            <rect x="235" y="30" width="150" height="24" rx="6" fill={activeStage === "compressor" ? (isVibration ? "#ef4444" : "#10b981") : (isVibration ? "#fef2f2" : "#ecfdf5")} stroke={isVibration ? "#ef4444" : "#10b981"} strokeWidth="1.5" />
            <text x="310" y="46" fill={activeStage === "compressor" ? "#ffffff" : (isVibration ? "#b91c1c" : "#047857")} fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
              2. COMPRESSOR (HPC)
            </text>
          </g>

          {/* STAGE 3: COMBUSTOR */}
          <g onClick={() => setActiveStage("combustor")} className="cursor-pointer">
            <line x1="535" y1="135" x2="535" y2="40" stroke={activeStage === "combustor" ? "#f97316" : "#64748b"} strokeWidth={activeStage === "combustor" ? "2.5" : "1.5"} strokeDasharray="3 3" />
            <circle cx="535" cy="135" r="4" fill={isFuelDrop ? "#f59e0b" : "#ef4444"} />
            <rect x="465" y="15" width="140" height="24" rx="6" fill={activeStage === "combustor" ? "#f97316" : (isFuelDrop ? "#fffbeb" : "#fef2f2")} stroke={isFuelDrop ? "#f59e0b" : "#ef4444"} strokeWidth="1.5" />
            <text x="535" y="31" fill={activeStage === "combustor" ? "#ffffff" : (isFuelDrop ? "#b45309" : "#b91c1c")} fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
              3. COMBUSTOR (T3)
            </text>
          </g>

          {/* STAGE 4: TURBINE */}
          <g onClick={() => setActiveStage("turbine")} className="cursor-pointer">
            <line x1="705" y1="125" x2="705" y2="55" stroke={activeStage === "turbine" ? "#a855f7" : "#64748b"} strokeWidth={activeStage === "turbine" ? "2.5" : "1.5"} strokeDasharray="3 3" />
            <circle cx="705" cy="125" r="4" fill={isOverheat ? "#ef4444" : "#a855f7"} />
            <rect x="640" y="30" width="130" height="24" rx="6" fill={activeStage === "turbine" ? (isOverheat ? "#ef4444" : "#a855f7") : (isOverheat ? "#fef2f2" : "#faf5ff")} stroke={isOverheat ? "#ef4444" : "#a855f7"} strokeWidth="1.5" />
            <text x="705" y="46" fill={activeStage === "turbine" ? "#ffffff" : (isOverheat ? "#b91c1c" : "#6b21a8")} fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
              4. TURBINE (HPT)
            </text>
          </g>

          {/* STAGE 5: EXHAUST NOZZLE */}
          <g onClick={() => setActiveStage("exhaust")} className="cursor-pointer">
            <line x1="870" y1="150" x2="870" y2="70" stroke={activeStage === "exhaust" ? "#0284c7" : "#64748b"} strokeWidth={activeStage === "exhaust" ? "2.5" : "1.5"} strokeDasharray="3 3" />
            <circle cx="870" cy="150" r="4" fill="#0284c7" />
            <rect x="805" y="45" width="130" height="24" rx="6" fill={activeStage === "exhaust" ? "#0284c7" : "#e0f2fe"} stroke="#0284c7" strokeWidth="1.5" />
            <text x="870" y="61" fill={activeStage === "exhaust" ? "#ffffff" : "#0369a1"} fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
              5. THRUST NOZZLE
            </text>
          </g>

          {/* Outer Engine Casing Housing */}
          <path
            d="M 50,150 Q 180,115 420,125 L 680,132 Q 820,145 920,175 L 920,245 Q 820,275 680,288 L 420,295 Q 180,305 50,270 Z"
            fill="url(#casing3DLight)"
            stroke="#0284c7"
            strokeWidth="3"
            opacity="0.9"
          />

          {/* Central Shaft */}
          <rect x="70" y="205" width="760" height="10" fill="url(#fanBladeCyan)" rx="5" />

          {/* ================= STAGE 1: INLET & AIR FAN ================= */}
          <g
            onClick={() => setActiveStage("fan")}
            className="cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
          >
            {/* Air Intake Flow Stream Lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <path
                key={i}
                d={`M 10,${170 + i * 22} Q 50,${175 + i * 20} 90,${180 + i * 18}`}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                opacity="0.8"
              >
                <animate attributeName="stroke-dashoffset" values="20;0" dur="0.6s" repeatCount="indefinite" />
              </path>
            ))}

            <rect x="70" y="155" width="90" height="110" fill={activeStage === "fan" ? "rgba(14,165,233,0.35)" : "rgba(14,165,233,0.12)"} rx="8" stroke="#0284c7" strokeWidth={activeStage === "fan" ? "4" : "2.5"} />
            
            {/* Rotating Fan Blades */}
            {[85, 105, 125, 145].map((x, idx) => (
              <path
                key={idx}
                d={`M ${x},160 Q ${x + 12},210 ${x},260`}
                fill="none"
                stroke="url(#fanBladeCyan)"
                strokeWidth="6"
                strokeLinecap="round"
                filter="url(#shadowGlow)"
              >
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,-4; 0,4; 0,-4"
                  dur={`${0.2 + idx * 0.05}s`}
                  repeatCount="indefinite"
                />
              </path>
            ))}
          </g>

          {/* ================= STAGE 2: 4-STAGE COMPRESSOR (HPC) ================= */}
          <g
            onClick={() => setActiveStage("compressor")}
            className={cn("cursor-pointer transition-all duration-200", isVibration && "animate-pulse")}
          >
            <polygon
              points="180,145 440,162 440,258 180,275"
              fill={activeStage === "compressor" ? (isVibration ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.35)") : (isVibration ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)")}
              stroke={isVibration ? "#ef4444" : "#10b981"}
              strokeWidth={activeStage === "compressor" ? "4.5" : "3"}
              filter={isVibration ? "url(#shadowFire)" : undefined}
            />

            {/* 4 Volumetric Disk Stages */}
            {[220, 280, 340, 400].map((x, idx) => (
              <g key={idx}>
                <ellipse cx={x} cy="210" rx="14" ry={55 - idx * 6} fill="url(#compressorEmerald)" stroke="#ffffff" strokeWidth="1.5" />
                <line x1={x} y1={155 + idx * 4} x2={x} y2={265 - idx * 4} stroke="#ffffff" strokeWidth="3" opacity="0.9" />
              </g>
            ))}
          </g>

          {/* ================= STAGE 3: ANNULAR COMBUSTOR RING ================= */}
          <g
            onClick={() => setActiveStage("combustor")}
            className={cn("cursor-pointer transition-all duration-200", isFuelDrop && "animate-pulse")}
          >
            <rect
              x="450"
              y="155"
              width="170"
              height="110"
              fill={activeStage === "combustor" ? (isFuelDrop ? "rgba(245,158,11,0.5)" : "url(#combustorOrange)") : (isFuelDrop ? "rgba(245,158,11,0.25)" : "url(#combustorOrange)")}
              rx="12"
              stroke={isFuelDrop ? "#f59e0b" : "#ef4444"}
              strokeWidth={activeStage === "combustor" ? "4.5" : "3"}
              filter="url(#shadowFire)"
            />

            {/* Animated Swirling Fire Jets */}
            {[475, 515, 555, 595].map((x, i) => (
              <g key={i}>
                <circle cx={x} cy="210" r="14" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5">
                  <animate attributeName="r" values="11;16;11" dur="0.5s" repeatCount="indefinite" />
                </circle>
                <circle cx={x} cy="210" r="6" fill="#ffffff" />
              </g>
            ))}
          </g>

          {/* ================= STAGE 4: HIGH-PRESSURE TURBINE (HPT) ================= */}
          <g
            onClick={() => setActiveStage("turbine")}
            className={cn("cursor-pointer transition-all duration-200", isOverheat && "animate-pulse")}
          >
            <polygon
              points="630,162 780,145 780,275 630,258"
              fill={activeStage === "turbine" ? (isOverheat ? "rgba(239,68,68,0.45)" : "rgba(168,85,247,0.38)") : (isOverheat ? "rgba(239,68,68,0.25)" : "rgba(168,85,247,0.18)")}
              stroke={isOverheat ? "#ef4444" : "#a855f7"}
              strokeWidth={activeStage === "turbine" ? "4.5" : "3"}
              filter={isOverheat ? "url(#shadowFire)" : undefined}
            />

            {/* Turbine Rotors */}
            {[660, 720, 760].map((x, idx) => (
              <g key={idx}>
                <ellipse cx={x} cy="210" rx="12" ry={50 + idx * 4} fill="url(#turbineViolet)" stroke="#ffffff" strokeWidth="1.5" />
              </g>
            ))}
          </g>

          {/* ================= EXHAUST THRUST NOZZLE ================= */}
          <g onClick={() => setActiveStage("exhaust")} className="cursor-pointer">
            <polygon points="780,165 960,180 960,240 780,255" fill="url(#thrustPlumeLight)" opacity={activeStage === "exhaust" ? 1 : 0.8} stroke="#0284c7" strokeWidth={activeStage === "exhaust" ? "3" : "0"} filter="url(#shadowGlow)" />
          </g>
        </svg>

        {/* 3D Telemetry Subpanel Pill Buttons with Full Solid Active Color Fill */}
        <div className="relative z-20 mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <button
            onClick={() => setActiveStage("fan")}
            className={cn(
              "rounded-lg border p-2.5 text-left transition-all duration-200 shadow-md",
              activeStage === "fan"
                ? "border-sky-600 bg-sky-600 text-white ring-2 ring-sky-300 scale-[1.03]"
                : "border-slate-300 bg-[#e1e9f2] text-slate-800 hover:bg-slate-200",
            )}
          >
            <div className={cn("mono text-[10px] uppercase font-bold", activeStage === "fan" ? "text-sky-100" : "text-sky-700")}>
              1. Fan & Inlet
            </div>
            <div className={cn("mono text-xs font-bold mt-1", activeStage === "fan" ? "text-white" : "text-slate-900")}>
              Mn {(engine.sensors as any).mach ?? 0.82}
            </div>
            <div className={cn("mono text-[9px] font-semibold", activeStage === "fan" ? "text-sky-100" : "text-slate-500")}>
              Pamb: {(((engine.sensors as any).pamb ?? 35600) / 1000).toFixed(1)} kPa
            </div>
          </button>

          <button
            onClick={() => setActiveStage("compressor")}
            className={cn(
              "rounded-lg border p-2.5 text-left transition-all duration-200 shadow-md",
              activeStage === "compressor"
                ? (isVibration ? "border-rose-600 bg-rose-600 text-white ring-2 ring-rose-300 scale-[1.03] animate-pulse" : "border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-300 scale-[1.03]")
                : (isVibration ? "border-rose-500 bg-rose-50 text-rose-900 animate-pulse" : "border-slate-300 bg-[#e1e9f2] text-slate-800 hover:bg-slate-200"),
            )}
          >
            <div className={cn("mono text-[10px] uppercase font-bold flex items-center justify-between", activeStage === "compressor" ? "text-emerald-100" : "text-emerald-700")}>
              <span>2. Compressor</span>
              {isVibration && <span className={activeStage === "compressor" ? "text-white font-bold" : "text-rose-600 font-bold"}>⚠️</span>}
            </div>
            <div className={cn("mono text-xs font-bold mt-1", activeStage === "compressor" ? "text-white" : "text-slate-900")}>
              P2: {engine.sensors.p2.toFixed(1)} kPa
            </div>
            <div className={cn("mono text-[9px] font-semibold", activeStage === "compressor" ? "text-emerald-100" : "text-slate-500")}>
              T2: {((engine.sensors as any).t2 ?? (engine.sensors.p2 * 2.5 + 280)).toFixed(1)} K
            </div>
          </button>

          <button
            onClick={() => setActiveStage("combustor")}
            className={cn(
              "rounded-lg border p-2.5 text-left transition-all duration-200 shadow-md",
              activeStage === "combustor"
                ? "border-amber-600 bg-amber-500 text-white ring-2 ring-amber-300 scale-[1.03]"
                : (isFuelDrop ? "border-amber-500 bg-amber-50 text-amber-900 animate-pulse" : "border-slate-300 bg-[#e1e9f2] text-slate-800 hover:bg-slate-200"),
            )}
          >
            <div className={cn("mono text-[10px] uppercase font-bold flex items-center justify-between", activeStage === "combustor" ? "text-amber-100" : "text-amber-700")}>
              <span>3. Combustor</span>
              {isFuelDrop && <span className={activeStage === "combustor" ? "text-white font-bold" : "text-amber-600 font-bold"}>⚠️</span>}
            </div>
            <div className={cn("mono text-xs font-bold mt-1", activeStage === "combustor" ? "text-white" : "text-slate-900")}>
              T3: {engine.sensors.t3.toFixed(1)} K
            </div>
            <div className={cn("mono text-[9px] font-semibold", activeStage === "combustor" ? "text-amber-100" : "text-slate-500")}>
              Fuel: {engine.sensors.fuel.toFixed(3)} kg/s
            </div>
          </button>

          <button
            onClick={() => setActiveStage("turbine")}
            className={cn(
              "rounded-lg border p-2.5 text-left transition-all duration-200 shadow-md",
              activeStage === "turbine"
                ? (isOverheat ? "border-rose-600 bg-rose-600 text-white ring-2 ring-rose-300 scale-[1.03] animate-pulse" : "border-purple-600 bg-purple-600 text-white ring-2 ring-purple-300 scale-[1.03]")
                : (isOverheat ? "border-rose-500 bg-rose-50 text-rose-900 animate-pulse" : "border-slate-300 bg-[#e1e9f2] text-slate-800 hover:bg-slate-200"),
            )}
          >
            <div className={cn("mono text-[10px] uppercase font-bold flex items-center justify-between", activeStage === "turbine" ? "text-purple-100" : "text-purple-700")}>
              <span>4. Turbine</span>
              {isOverheat && <span className={activeStage === "turbine" ? "text-white font-bold" : "text-rose-600 font-bold"}>⚠️</span>}
            </div>
            <div className={cn("mono text-xs font-bold mt-1", activeStage === "turbine" ? "text-white" : "text-slate-900")}>
              T4: {((engine.sensors as any).t4 ?? (engine.sensors.t3 * 0.78)).toFixed(1)} K
            </div>
            <div className={cn("mono text-[9px] font-semibold", activeStage === "turbine" ? "text-purple-100" : "text-slate-500")}>
              P4: {((engine.sensors as any).p4 ?? (engine.sensors.p2 * 0.32)).toFixed(1)} kPa
            </div>
          </button>

          <button
            onClick={() => setActiveStage("exhaust")}
            className={cn(
              "rounded-lg border p-2.5 text-left transition-all duration-200 shadow-md col-span-2 sm:col-span-1",
              activeStage === "exhaust"
                ? "border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-300 scale-[1.03]"
                : "border-slate-300 bg-[#e1e9f2] text-slate-800 hover:bg-slate-200",
            )}
          >
            <div className={cn("mono text-[10px] uppercase font-bold", activeStage === "exhaust" ? "text-indigo-100" : "text-sky-700")}>
              5. Thrust Nozzle
            </div>
            <div className={cn("mono text-xs font-bold mt-1", activeStage === "exhaust" ? "text-white" : "text-slate-900")}>
              {(engine.sensors.rpm * 0.0035 + 24.5).toFixed(1)} kN
            </div>
            <div className={cn("mono text-[9px] font-semibold", activeStage === "exhaust" ? "text-indigo-100" : "text-slate-500")}>
              RUL: {engine.rul.toFixed(0)} Cyc
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
