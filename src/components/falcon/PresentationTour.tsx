import { useState, useEffect } from "react";
import { Play, Pause, ChevronRight, ChevronLeft, Volume2, VolumeX, Sparkles, CheckCircle2, FileText, X, Award } from "lucide-react";
import { soundFx } from "@/lib/audio-effects";
import { generateHalMaintenancePdf } from "@/lib/pdf-export";
import type { Engine } from "@/lib/telemetry";
import type { PageKey } from "./FalconApp";

type PresentationTourProps = {
  activePage: PageKey;
  selectedEngine: Engine;
  onSetPage: (page: PageKey) => void;
  onSelectEngine: (id: string) => void;
  onToggleAnomaly: (anomaly: import("@/lib/telemetry").AnomalyType) => void;
};

type TourBeat = {
  step: number;
  title: string;
  page: PageKey;
  targetEngineId?: string;
  anomalyToTrigger?: import("@/lib/telemetry").AnomalyType;
  scriptText: string;
  highlightBadge: string;
};

const TOUR_BEATS: TourBeat[] = [
  {
    step: 1,
    title: "Fleet Command & 14-Channel Monitoring",
    page: "overview",
    scriptText: "Honorable Judges, FALCON monitors single-spool turbojet engines across 14 permitted telemetry channels. Notice how engine TJ-04C is operating in degraded watch status.",
    highlightBadge: "Aerothon Section 4 & 5",
  },
  {
    step: 2,
    title: "14-Channel Telemetry & Hidden State Reconstruction",
    page: "engine",
    targetEngineId: "TJ-04C",
    scriptText: "Drilling into engine TJ-04C: live sensor streams P2, T2, P3, T3, P4, T4 are processed at 1Hz. PINN surrogate physics reconstructs unmeasurable internal states.",
    highlightBadge: "Aerothon Section 8 (Derived Physics)",
  },
  {
    step: 3,
    title: "In-Flight Thermal Anomaly & PINN Loss Residual",
    page: "engine",
    targetEngineId: "TJ-04C",
    anomalyToTrigger: "overheat",
    scriptText: "Injecting an in-flight turbine thermal surge: notice how the PINN composite loss residual detects unphysical drift while enforcing energy bounds below 0.018 kW residual!",
    highlightBadge: "Aerothon Section 9 & 22 (PINN Loss)",
  },
  {
    step: 4,
    title: "Causal Reasoning & Failure Root-Cause Analysis",
    page: "graph",
    targetEngineId: "TJ-04C",
    scriptText: "Unlike black-box AI, FALCON's Knowledge Graph traces Sensor Drift ➔ Subsystem ➔ Thermal Barrier Coating (TBC) Erosion ➔ MIL-STD Level-2 Depot Action.",
    highlightBadge: "Aerothon Section 14 (Explainability)",
  },
  {
    step: 5,
    title: "Counterfactual What-If Sandbox Simulation",
    page: "whatif",
    targetEngineId: "TJ-04C",
    scriptText: "What-If Sandbox allows air defense commanders to simulate extreme ambient heat, fuel contamination, and supersonic dash stress before actual flight dispatch.",
    highlightBadge: "Aerothon Section 15 & 16",
  },
  {
    step: 6,
    title: "18 Master Equations Companion Reference",
    page: "physics",
    targetEngineId: "TJ-04C",
    scriptText: "Every physical law, Brayton Cycle efficiency equation (Eq 3.1), shaft power balance (Eq 7.2), and PINN loss function (Eq 15.1) is derived in our companion technical specification.",
    highlightBadge: "Companion Spec (18 Master Equations)",
  },
  {
    step: 7,
    title: "1-Click HAL Level-2 Audit PDF Work Order Dispatch",
    page: "engine",
    targetEngineId: "TJ-04C",
    scriptText: "With a single click, FALCON generates a complete defense-grade HAL Level-2 Audit PDF report complete with MIL-STD compliance checks and Chief Engineer sign-off stamps!",
    highlightBadge: "Aerothon Final Deliverable",
  },
];

export function PresentationTour({
  activePage,
  selectedEngine,
  onSetPage,
  onSelectEngine,
  onToggleAnomaly,
}: PresentationTourProps) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [muted, setMuted] = useState(false);

  const beat = TOUR_BEATS[currentStep];

  const handleNext = () => {
    soundFx.playPitchNext();
    if (currentStep < TOUR_BEATS.length - 1) {
      const nextIdx = currentStep + 1;
      setCurrentStep(nextIdx);
      applyBeat(TOUR_BEATS[nextIdx]);
    }
  };

  const handlePrev = () => {
    soundFx.playClick();
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      setCurrentStep(prevIdx);
      applyBeat(TOUR_BEATS[prevIdx]);
    }
  };

  const applyBeat = (b: TourBeat) => {
    if (b.targetEngineId && selectedEngine.id !== b.targetEngineId) {
      onSelectEngine(b.targetEngineId);
    }
    if (b.page !== activePage) {
      onSetPage(b.page);
    }
    if (b.anomalyToTrigger) {
      soundFx.playAlarm();
      onToggleAnomaly(b.anomalyToTrigger);
    }
  };

  const startTour = () => {
    soundFx.playPitchNext();
    setActive(true);
    setCurrentStep(0);
    applyBeat(TOUR_BEATS[0]);
  };

  const triggerPdfFromTour = () => {
    soundFx.playDispatchSuccess();
    generateHalMaintenancePdf(selectedEngine, selectedEngine.activeAnomalies || []);
  };

  if (!active) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={startTour}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl hover:from-sky-500 hover:to-indigo-500 transition-all border border-sky-300/40 hover:scale-105 cursor-pointer glow-cyan"
        >
          <Award className="h-4 w-4 text-amber-300 animate-bounce" />
          <span>Judges Pitch Mode (3-Min Tour)</span>
          <Sparkles className="h-3.5 w-3.5 text-sky-200" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl">
      <div className="rounded-2xl border-2 border-sky-400 bg-slate-950/95 text-white p-4 shadow-2xl backdrop-blur-md space-y-3">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="mono text-xs font-extrabold text-sky-400 bg-sky-950 border border-sky-700 px-2.5 py-0.5 rounded-full">
              PITCH TOUR STEP {beat.step} OF {TOUR_BEATS.length}
            </span>
            <span className="eyebrow text-xs font-bold text-amber-400 bg-amber-950/70 border border-amber-800 px-2 py-0.5 rounded">
              {beat.highlightBadge}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextMute = !muted;
                setMuted(nextMute);
                soundFx.enabled = !nextMute;
              }}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Toggle HUD Audio"
            >
              {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-sky-400" />}
            </button>

            <button
              onClick={() => {
                soundFx.playClick();
                setActive(false);
              }}
              className="p-1 rounded text-slate-400 hover:text-rose-400"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Title & Script text */}
        <div>
          <h4 className="mono text-sm font-extrabold text-sky-300 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            {beat.title}
          </h4>
          <p className="text-xs text-slate-200 font-sans mt-1 leading-relaxed bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            "{beat.scriptText}"
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep === TOUR_BEATS.length - 1}
              className="flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-40 shadow-md cursor-pointer"
            >
              <span>Next Step</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {beat.step === 7 && (
            <button
              onClick={triggerPdfFromTour}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 shadow-lg animate-pulse cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Generate HAL Audit PDF Now</span>
            </button>
          )}

          <div className="text-[11px] mono text-slate-400">
            Team Avyay · Aerothon 2026 Presentation Mode
          </div>
        </div>
      </div>
    </div>
  );
}
