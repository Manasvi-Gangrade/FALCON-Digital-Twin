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

function FalconLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <defs>
        <linearGradient id="falcon-top-g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path
        d="M4 22 L16 6 L28 22 L22 22 L16 14 L10 22 Z"
        fill="url(#falcon-top-g)"
        stroke="url(#falcon-top-g)"
        strokeWidth="0.5"
      />
      <circle cx="16" cy="25" r="1.6" fill="#0ea5e9" />
    </svg>
  );
}

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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-800 bg-[#0a0f1d] px-3 sm:px-6">
      {/* Left: Clean Brand & Mission Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FalconLogo size={22} />
          <span className="mono text-sm font-bold tracking-widest text-white">FALCON</span>
        </div>
        <span className="text-slate-700 hidden sm:inline">•</span>
        <span className="mono text-[10px] tracking-wider text-sky-400 font-bold hidden md:inline-block">
          MISSION CONTROL
        </span>
      </div>

      {/* Right: Streamlined Action & Status Bar */}
      <div className="relative flex items-center gap-2 sm:gap-3">
        {/* Python API Status Dot Badge */}
        <button
          onClick={() => window.open("http://127.0.0.1:8000/docs", "_blank")}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] mono font-bold transition-all cursor-pointer shadow-sm",
            backend.online
              ? "border-emerald-500 bg-[#064e3b] text-emerald-100 hover:bg-[#047857]"
              : "border-amber-600 bg-[#451a03] text-amber-100 hover:bg-[#78350f]"
          )}
          title={backend.online ? "Python FastAPI PINN Engine Connected (Port 8000)" : "FastAPI Standby Mode (TS PINN Active)"}
        >
          <span className={cn("h-2 w-2 rounded-full", backend.online ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
          <span>{backend.online ? "API ONLINE" : "API STANDBY"}</span>
        </button>

        {/* Pitch Summary Modal Toggle Button */}
        <button
          onClick={() => setShowPitchModal(true)}
          className="flex items-center gap-1.5 rounded-md border border-sky-400 bg-[#0284c7] px-3 py-1 text-xs font-bold text-white hover:bg-[#0369a1] transition-all shadow-md cursor-pointer"
          title="System Overview"
        >
          <Presentation className="h-3.5 w-3.5 text-sky-100" />
          <span className="hidden sm:inline">System Summary</span>
        </button>

        {/* Export HAL PDF Button */}
        <button
          onClick={() => generateHalMaintenancePdf(selected, selected.activeAnomalies)}
          className="flex items-center gap-1.5 rounded-md border border-emerald-400 bg-[#059669] px-3 py-1 text-xs font-bold text-white hover:bg-[#047857] transition-all shadow-md cursor-pointer"
          title="Export HAL Report (PDF)"
        >
          <FileText className="h-3.5 w-3.5 text-emerald-100" />
          <span className="hidden md:inline">Export Report</span>
        </button>

        {/* Audio FX Mute Toggle */}
        <button
          onClick={toggleAudio}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-all shadow-sm cursor-pointer",
            audioEnabled
              ? "border-sky-500 bg-[#1e293b] text-sky-300 hover:bg-[#334155]"
              : "border-slate-700 bg-[#0f172a] text-slate-400"
          )}
          title={audioEnabled ? "HUD Audio Active (Click to Mute)" : "HUD Audio Muted"}
        >
          {audioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Solid High-Contrast Engine Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md border border-slate-600 bg-[#0f172a] px-3 py-1 text-xs hover:border-sky-400 transition-all text-white cursor-pointer font-bold shadow-sm"
          >
            <StatusDot severity={selected.severity} />
            <span className="mono font-bold text-white">{selected.id}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform text-sky-400", open && "rotate-180")} />
          </button>

          {open && (
            <div className="anim-fade-up absolute right-0 top-10 z-50 min-w-[220px] rounded-lg border-2 border-slate-700 bg-[#0f172a] p-1.5 shadow-2xl text-white">
              {engines.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    onSelect(e.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-xs transition-colors cursor-pointer",
                    e.id === selectedId
                      ? "bg-sky-600 text-white font-bold"
                      : "text-slate-200 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot severity={e.severity} />
                    <span className="mono font-bold">{e.id}</span>
                    <span className="text-[10px] text-slate-400">{e.tail}</span>
                  </div>
                  <div className="mono font-bold text-sky-300">{e.health.toFixed(0)}%</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clock & Live Badge */}
        <div className="hidden lg:flex items-center gap-2 rounded-md border border-slate-700 bg-[#1e293b] px-3 py-1 shadow-sm">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute rounded-full border anim-pulse-ring border-sky-400 w-3 h-3" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
          </span>
          <span className="mono text-[10px] font-bold text-slate-200 tabular-nums">{clock}</span>
        </div>
      </div>

      {/* Pitch Cheat Sheet Modal Overlay via React Portal */}
      {showPitchModal && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 sm:p-6 anim-fade-up">
          <div className="relative w-full max-w-3xl rounded-2xl border-2 border-slate-300 bg-white p-0 shadow-2xl text-slate-900 space-y-0 max-h-[88vh] overflow-hidden flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Presentation className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-extrabold tracking-wide text-white">AEROTHON 2026 — FALCON Document Summary</h3>
                  <p className="mono text-[10px] text-slate-300">IIT Indore x Hindustan Aeronautics Limited (HAL) · Team Avyay</p>
                </div>
              </div>
              <button
                onClick={() => setShowPitchModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(88vh-120px)] text-slate-800">
              {/* Submission Header Card */}
              <div className="rounded-xl bg-sky-900 text-white p-4 text-xs space-y-2 shadow-md">
                <div className="flex flex-wrap justify-between items-center border-b border-sky-700/60 pb-2">
                  <span className="font-extrabold text-sm text-sky-300">FALCON: Four-Stage Aeroengine Latent Component & Operational Network</span>
                  <span className="bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase">Confidential Defense Submission</span>
                </div>
                <p className="italic text-sky-200 font-serif text-[11px]">
                  "From sensor readings to engineering insight: estimating what cannot be measured directly, and explaining why."
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] mono text-slate-200">
                  <div><strong>Team Name:</strong> Avyay (3 Members)</div>
                  <div><strong>Team Lead:</strong> Manasvi Gangrade (gangrademanasvi@gmail.com)</div>
                  <div><strong>Team Members:</strong> Muskan Lodhi, Suhani Sharma</div>
                  <div><strong>Primary Challenge:</strong> Physics-Informed Digital Twin for Turbojet Monitoring</div>
                </div>
              </div>

              {/* Six Interconnected Modules */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 shadow-2xs">
                <div className="font-extrabold text-sky-900 uppercase tracking-wider text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  1. Six Interconnected System Modules (Section 5 & 10)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="text-sky-800">1. Physics-Informed Digital Twin:</strong> Reconstructs unmeasurable internal states using surrogate PINN constraints.
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="text-sky-800">2. Health Intelligence Engine:</strong> Evaluates Compressor, Combustor, Turbine health & Overall Health Index.
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="text-sky-800">3. Engineering Reasoning Engine:</strong> Knowledge Graph mapping Sensor Drift ➔ Subsystem ➔ Failure ➔ Depot Action.
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="text-sky-800">4. Predictive Maintenance Engine:</strong> Estimates RUL (Remaining Useful Life), 50-cycle trends & Priority Board.
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="text-sky-800">5. AI Maintenance Assistant:</strong> Conversational NLP interface grounded in physical module outputs.
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <strong className="text-sky-800">6. Interactive Dashboard:</strong> Unified HUD visualization with What-If counterfactual scenario sandbox.
                  </div>
                </div>
              </div>

              {/* 14 Permitted Sensors & Derived Features */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 shadow-2xs">
                <div className="font-extrabold text-sky-900 uppercase tracking-wider text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  2. 14 Permitted Measurements & Section 8 Derived Features
                </div>
                <p className="text-xs text-slate-700">
                  <strong>14 Input Channels:</strong> Altitude, Mach, Tamb, Pamb, Shaft Speed (RPM), Fuel Flow Rate, P2, T2, P3, T3, P4, T4.
                </p>
                <div className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 space-y-1">
                  <div><strong>Derived Thermodynamic Features:</strong></div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 font-mono">
                    <li>Compressor Pressure Ratio: P2 / Pamb (Fouling indicator)</li>
                    <li>Compressor Temperature Rise: T2 - Tamb (Work & Efficiency)</li>
                    <li>Turbine Expansion Ratio: P3 / P4 (Energy extraction)</li>
                    <li>Turbine Temperature Drop: T3 - T4 (Blade erosion proxy)</li>
                    <li>Fuel-to-RPM Ratio & Cycle-to-Cycle Rolling Deltas</li>
                  </ul>
                </div>
              </div>

              {/* Innovation & USP Table */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 shadow-2xs">
                <div className="font-extrabold text-sky-900 uppercase tracking-wider text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  3. Innovation & USP Matrix (Section 27 vs Conventional)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse bg-white rounded border border-slate-200">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2 border-b">Feature Aspect</th>
                        <th className="p-2 border-b text-slate-500">Conventional Monitoring</th>
                        <th className="p-2 border-b text-sky-700 font-extrabold">FALCON Proposed Twin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      <tr>
                        <td className="p-2 font-bold">Interpretation</td>
                        <td className="p-2 text-slate-500">Displays raw measurements</td>
                        <td className="p-2 text-sky-900 font-medium">Interprets into engineering insight</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">Explainability</td>
                        <td className="p-2 text-slate-500">Black-box score only</td>
                        <td className="p-2 text-sky-900 font-medium">Causal reasoning via Knowledge Graph</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">Maintenance</td>
                        <td className="p-2 text-slate-500">Fixed-schedule inspections</td>
                        <td className="p-2 text-sky-900 font-medium">Condition-informed + RUL prioritization</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold">Uncertainty</td>
                        <td className="p-2 text-slate-500">Deterministic numbers</td>
                        <td className="p-2 text-sky-900 font-medium">Quantified confidence bounds (±1.4%)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Physics & Mathematics Equations Companion Reference */}
              <div className="rounded-xl border border-sky-300 bg-sky-50/70 p-4 space-y-2 shadow-2xs">
                <div className="font-extrabold text-sky-900 uppercase tracking-wider text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sky-600" />
                  4. Companion Technical Document: 18 Governing Equations
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  Integrates all 16 physical laws, thermodynamic equations, and derived formulations: Brayton Cycle (Eq 3.1), Compressor/Turbine Isentropic Efficiencies (Eq 4.3, 6.3), Single-Spool Power Balance (Eq 7.2), Net Thrust (Eq 9.1), TSFC (Eq 9.3), Non-Linear RUL (Eq 13.2), Predictive Uncertainty (Eq 14.1), and PINN Composite Loss (Eq 15.1).
                </p>
                <div className="mono text-[11px] font-bold text-sky-800 bg-white p-2 rounded border border-sky-200">
                  ⚡ Interactive Live Thermodynamic Evaluator available under 'Physics Reference' tab!
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center bg-slate-100 px-6 py-3 border-t border-slate-200">
              <span className="text-xs text-slate-600 font-medium">Official Submission for Aerothon 2026 Presentation</span>
              <button
                onClick={() => setShowPitchModal(false)}
                className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-700 transition-colors shadow-sm cursor-pointer"
              >
                Got It! System Verified 🚀
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
