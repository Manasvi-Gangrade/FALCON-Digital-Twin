import { useState, useEffect } from "react";
import type { Engine } from "@/lib/telemetry";
import { severityColor } from "@/lib/telemetry";
import { Radio, Plane, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

export function RadarFleetMap({
  engines,
  onSelectEngine,
}: {
  engines: Engine[];
  onSelectEngine: (id: string) => void;
}) {
  const [angle, setAngle] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Radar sweep animation angle loop
  useEffect(() => {
    const interval = setInterval(() => {
      setAngle((a) => (a + 3) % 360);
    }, 35);
    return () => clearInterval(interval);
  }, []);

  // Polar coordinates calculation for 5 engine blips
  const blipPositions = engines.map((e, idx) => {
    const headingDeg = idx * 72 + 25;
    const rad = (headingDeg * Math.PI) / 180;
    const distanceKm = 40 + (idx % 3) * 45;
    const r = (distanceKm / 150) * 140; // max radius 140px
    const cx = 160 + r * Math.sin(rad);
    const cy = 160 - r * Math.cos(rad);
    return { engine: e, cx, cy, distanceKm, headingDeg };
  });

  return (
    <div className="panel panel-accent-cyan relative overflow-hidden bg-[#f0f4f8] border border-[#cbd5e1] p-4 sm:p-5 shadow-md rounded-xl text-slate-800 flex flex-col items-center">
      {/* Radar Title Header */}
      <div className="flex w-full items-center justify-between border-b border-slate-300 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/30">
            <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
          </div>
          <div>
            <div className="eyebrow text-emerald-700 font-bold">Aerothon Sector IV Airspace Radar</div>
            <span className="mono text-xs font-bold text-slate-900">Tactical Fighter Sortie Radar</span>
            <p className="text-[10px] text-slate-600 font-sans mt-0.5">
              <strong>What this radar shows:</strong> Real-time polar airspace positioning & live sortie health status for all 5 monitored HAL fighter jet units within 150km defense sector.
            </p>
          </div>
        </div>
        <span className="mono text-[10px] rounded bg-white px-2 py-1 border border-slate-300 text-sky-700 font-bold shadow-sm">
          MAX RANGE: 150 KM
        </span>
      </div>

      {/* Crisp White 3D Circular Radar Container */}
      <div className="relative h-[320px] w-[320px] rounded-full border-2 border-emerald-500/40 bg-white shadow-md flex items-center justify-center overflow-hidden">
        {/* Concentric Range Rings */}
        <div className="absolute h-[90px] w-[90px] rounded-full border border-emerald-500/30" />
        <div className="absolute h-[180px] w-[180px] rounded-full border border-emerald-500/35" />
        <div className="absolute h-[260px] w-[260px] rounded-full border border-emerald-500/40" />

        {/* Tactical Crosshair Axes */}
        <line x1="0" y1="160" x2="320" y2="160" stroke="rgba(16,185,129,0.35)" strokeDasharray="4 4" className="absolute" />
        <line x1="160" y1="0" x2="160" y2="320" stroke="rgba(16,185,129,0.35)" strokeDasharray="4 4" className="absolute" />

        {/* Cardinal Compass Directions */}
        <span className="absolute top-2 mono text-[10px] font-bold text-emerald-700">N (000°)</span>
        <span className="absolute right-2 mono text-[10px] font-bold text-emerald-700">E (090°)</span>
        <span className="absolute bottom-2 mono text-[10px] font-bold text-emerald-700">S (180°)</span>
        <span className="absolute left-2 mono text-[10px] font-bold text-emerald-700">W (270°)</span>

        {/* Sweeping Scanner Gradient Ray */}
        <div
          className="absolute h-[160px] w-[160px] origin-bottom-right transition-transform"
          style={{
            top: 0,
            left: 0,
            transform: `rotate(${angle}deg)`,
            background: "conic-gradient(from 90deg at 100% 100%, rgba(16,185,129,0.45) 0deg, rgba(16,185,129,0.15) 30deg, transparent 75deg)",
          }}
        />

        {/* Air Force Base Station Central Marker */}
        <div className="absolute h-4 w-4 rounded-full border-2 border-white bg-emerald-600 shadow-md" />

        {/* Aircraft Fighter Jet Blips */}
        {blipPositions.map(({ engine: e, cx, cy, distanceKm, headingDeg }) => {
          const isHovered = hoveredId === e.id;
          const isCritical = e.severity === "critical";

          return (
            <div
              key={e.id}
              onClick={() => onSelectEngine(e.id)}
              onMouseEnter={() => setHoveredId(e.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 hover:scale-125 z-20"
              style={{ left: `${cx}px`, top: `${cy}px` }}
            >
              {/* Aircraft Fighter Jet Silhouette Icon */}
              <div className="relative flex items-center justify-center">
                {/* Outer Pulsing Halo */}
                <div
                  className={cn(
                    "absolute h-7 w-7 rounded-full border opacity-70 animate-ping",
                    isCritical ? "border-rose-500 bg-rose-500/20" : "border-emerald-500 bg-emerald-500/20",
                  )}
                />

                {/* Jet Icon rotated to heading */}
                <div
                  className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 shadow-md"
                  style={{
                    borderColor: severityColor(e.severity),
                    transform: `rotate(${headingDeg}deg)`,
                  }}
                >
                  <Plane className="h-3.5 w-3.5" style={{ color: severityColor(e.severity) }} />
                </div>
              </div>

              {/* Hover Tactical Tooltip Card */}
              <div
                className={cn(
                  "pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border bg-white p-2.5 shadow-xl backdrop-blur-md transition-all duration-200 z-30 mono text-[10px] text-slate-800",
                  isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95",
                  isCritical ? "border-rose-400" : "border-emerald-400",
                )}
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Crosshair className="h-3 w-3 text-sky-600" />
                  <span>{e.id} ({e.tail})</span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-3 text-[9px] text-slate-600 font-semibold">
                  <div>Health: <span className="font-bold text-slate-900">{e.health.toFixed(0)}%</span></div>
                  <div>Range: <span className="font-bold text-sky-600">{distanceKm} km</span></div>
                  <div>Status: <span className="font-bold uppercase" style={{ color: severityColor(e.severity) }}>{e.severity}</span></div>
                  <div>RUL: <span className="font-bold text-emerald-600">{e.rul.toFixed(0)} Cyc</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend Footer */}
      <div className="mt-3.5 flex items-center justify-center gap-5 mono text-[10px] text-slate-600 font-semibold">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" /> Nominal</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-sm" /> Watch</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm animate-pulse" /> Critical</span>
      </div>
    </div>
  );
}
