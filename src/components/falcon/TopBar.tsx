import { ChevronDown, Menu, Server, FileText, Volume2, VolumeX, Presentation, X, CheckCircle2 } from "lucide-react";
import { useUtcClock } from "@/lib/use-utc-clock";
import type { Engine } from "@/lib/telemetry";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { StatusDot } from "./StatusDot";
import { checkBackendHealth, type BackendStatus } from "@/lib/api";
import { generateHalMaintenancePdf } from "@/lib/pdf-export";
import { soundFx } from "@/lib/audio-effects";

export function TopBar({
  engines,
  selectedId,
  onSelect,
  onToggleMobileMenu,
}: {
  engines: Engine[];
  selectedId: string;
  onSelect: (id: string) => void;
  onToggleMobileMenu?: () => void;
}) {
  const clock = useUtcClock();
  const [open, setOpen] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [backend, setBackend] = useState<BackendStatus>({ online: false });
  const [audioEnabled, setAudioEnabled] = useState(true);
  const selected = engines.find((e) => e.id === selectedId) ?? engines[0];

  const toggleAudio = () => {
    soundFx.enabled = !audioEnabled;
    setAudioEnabled(!audioEnabled);
    if (!audioEnabled) soundFx.playClick();
  };

  useEffect(() => {
    let active = true;
    const poll = async () => {
      const res = await checkBackendHealth();
      if (active) setBackend(res);
    };
    poll();
    const interval = setInterval(poll, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-hud-border bg-[#121b2d]/85 px-3 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-hud-border bg-[color:var(--hud-panel)] text-slate-300 hover:text-hud-cyan md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-400 truncate max-w-[140px] sm:max-w-none">
          Mission Control · Sector IV
        </div>
      </div>

      <div className="relative flex items-center gap-2 sm:gap-4">
        {/* Aerothon 2026 Presentation Pitch Cheat Sheet / System Summary Modal Toggle */}
        <button
          onClick={() => setShowPitchModal(true)}
          className="flex items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-300 hover:bg-sky-500/20 transition-all shadow-sm cursor-pointer"
          title="Open Aerothon 2026 FALCON System Summary & Architecture Overview"
        >
          <Presentation className="h-3.5 w-3.5 text-sky-400" />
          <span className="hidden sm:inline">System Summary</span>
        </button>

        {/* Tactical Audio Toggle */}
        <button
          onClick={toggleAudio}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-all shadow-sm",
            audioEnabled
              ? "border-hud-cyan/40 bg-hud-cyan/10 text-hud-cyan"
              : "border-hud-border bg-[color:var(--hud-panel)] text-hud-muted",
          )}
          title={audioEnabled ? "Tactical HUD Sound FX Active (Click to Mute)" : "Tactical HUD Sound FX Muted"}
        >
          {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        {/* HAL Executive PDF Export Button */}
        <button
          onClick={() => generateHalMaintenancePdf(selected, selected.activeAnomalies)}
          className="hidden sm:flex items-center gap-1.5 rounded-md border border-hud-cyan/40 bg-hud-cyan/10 px-2.5 py-1 text-xs font-bold text-hud-cyan hover:bg-hud-cyan/20 transition-all shadow-sm"
          title="Export Official HAL Defense Maintenance Report (PDF)"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Export HAL Report</span>
        </button>

        {/* Python FastAPI Status Badge */}
        <button
          onClick={() => window.open("http://127.0.0.1:8000/docs", "_blank")}
          className={cn(
            "hidden md:flex items-center gap-2 rounded-md border px-2.5 py-1 mono text-[10px] uppercase tracking-wider transition-all cursor-pointer hover:scale-105 shadow-sm",
            backend.online
              ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              : "border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
          )}
          title={backend.online ? "Python FastAPI PINN Engine Connected (Port 8000) — Click to open OpenAPI Swagger Docs" : "FastAPI Standby Mode (TS PINN Simulation Active)"}
        >
          <Server className="h-3 w-3 shrink-0 text-emerald-400" />
          <span>Python API:</span>
          <span className="font-bold text-white">{backend.online ? "ONLINE (v1.0)" : "STANDBY"}</span>
          <span className={cn("h-1.5 w-1.5 rounded-full", backend.online ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
        </button>

        {/* Engine selector */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 sm:gap-2 rounded-md border border-hud-border bg-[color:var(--hud-panel)] px-2 sm:px-3 py-1.5 text-xs hover:border-hud-cyan/40 shadow-sm text-slate-800"
        >
          <StatusDot severity={selected.severity} />
          <span className="mono font-semibold text-slate-200">{selected.id}</span>
          <span className="hidden sm:inline text-slate-400">·</span>
          <span className="hidden sm:inline text-slate-400">{selected.tail}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform text-slate-400", open && "rotate-180")} />
        </button>

        {open && (
          <div
            className="anim-fade-up absolute right-0 sm:right-32 top-12 z-30 min-w-[240px] sm:min-w-[260px] rounded-md border border-hud-border bg-[#162035] p-1 shadow-xl text-slate-200"
          >
            {engines.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  onSelect(e.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors",
                  e.id === selectedId && "bg-hud-cyan/15 text-hud-cyan font-bold",
                )}
              >
                <StatusDot severity={e.severity} />
                <span className="mono font-semibold">{e.id}</span>
                <span className="text-slate-400">{e.tail}</span>
                <span className="mono ml-auto text-slate-300">{e.health.toFixed(0)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="hidden sm:block mono text-xs text-slate-100 tabular-nums">{clock}</div>

        <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-hud-cyan/20 bg-hud-cyan/5 px-2 sm:px-2.5 py-1">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span
              className="absolute rounded-full border anim-pulse-ring"
              style={{ borderColor: "var(--hud-cyan)", width: "14px", height: "14px" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: "var(--hud-cyan)" }}
            />
          </span>
          <span className="mono text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-hud-cyan">
            LIVE
          </span>
        </div>
      </div>

      {/* Pitch Cheat Sheet Modal Overlay via React Portal */}
      {showPitchModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 anim-fade-up">
          <div className="relative w-full max-w-2xl rounded-2xl border-2 border-slate-300 bg-white p-0 shadow-2xl text-slate-900 space-y-0 max-h-[85vh] overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Presentation className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-extrabold tracking-wide text-white">Aerothon 2026 — FALCON System Summary</h3>
                  <p className="mono text-[10px] text-slate-400">Team Avyay (IIT Indore x HAL) · Physics Twin Architecture</p>
                </div>
              </div>
              <button
                onClick={() => setShowPitchModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)]">
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-3.5 text-xs mono text-sky-900 flex justify-between items-center shadow-2xs">
                <div>
                  <strong>Team Avyay:</strong> Manasvi Gangrade (Lead) | Muskan Lodhi | Suhani Sharma
                </div>
                <span className="bg-sky-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">IIT Indore x HAL</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 shadow-2xs">
                  <div className="font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    1. Problem & PINN Architecture Overview
                  </div>
                  <p className="text-slate-700 font-medium">
                    "We built FALCON — a Physics-Informed Digital Twin for Kaveri 4-Stage Turbojets. It estimates hidden thermodynamic states using 14 permitted sensor channels while enforcing physical energy conservation laws."
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 shadow-2xs">
                  <div className="font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    2. Derived Physics Features (Section 8)
                  </div>
                  <p className="text-slate-700 font-medium">
                    "Instead of raw black-box ML, we engineer 6 derived thermodynamic parameters: Compressor Pressure Ratio (P2/Pamb), Compressor Temp Rise (T2-Tamb), Turbine Expansion Ratio (P3/P4), Turbine Temp Drop (T3-T4), Fuel/RPM Ratio, and PINN Energy Balance Error (&lt; 0.018 kW)."
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 shadow-2xs">
                  <div className="font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    3. Explainable Knowledge Graph (Section 14)
                  </div>
                  <p className="text-slate-700 font-medium">
                    "Our system provides full explainability: sensor drift traces directly to component failure mechanisms (e.g. T3 surge &rarr; Thermal Coating Erosion &rarr; Level-2 Depot Borescope Dispatch)."
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 shadow-2xs">
                  <div className="font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    4. Actionable Maintenance & Defense PDF Export
                  </div>
                  <p className="text-slate-700 font-medium">
                    "With 1 click, engineers generate an official HAL Level-2 Maintenance PDF Dispatch Ticket complete with MIL-STD compliance matrix and chief engineer sign-off stamp."
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end bg-slate-100 px-6 py-3 border-t border-slate-200">
              <button
                onClick={() => setShowPitchModal(false)}
                className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-700 transition-colors shadow-sm cursor-pointer"
              >
                Got It! Ready To Demo 🚀
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
