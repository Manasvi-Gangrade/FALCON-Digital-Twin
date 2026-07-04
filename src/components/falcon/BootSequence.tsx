import { useEffect, useState } from "react";
import { FalconLogo } from "./FalconApp";

const LINES = [
  "INITIALIZING TELEMETRY LINK ....... ONLINE",
  "LOADING PHYSICS-INFORMED DIGITAL TWIN ....... READY",
  "ENGINE FLEET SYNCED ....... 5 UNITS",
  "SENSOR CHANNELS: RPM · FUEL · T3 · P2 ....... LOCKED",
  "FALCON OPERATIONAL",
];

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timers: number[] = [];
    LINES.forEach((_, i) => {
      timers.push(window.setTimeout(() => setStep(i + 1), 350 + i * 340));
    });
    timers.push(window.setTimeout(() => setFading(true), 2600));
    timers.push(window.setTimeout(onDone, 3100));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      className={`fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-[color:var(--hud-bg)] transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      style={{ zIndex: 100 }}
    >
      {/* radial sweep */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(14, 165, 233, 0.08) 30deg, transparent 60deg)",
            animation: "spin 2.4s linear",
          }}
        />
        <div
          className="absolute left-0 right-0 h-24"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(14, 165, 233, 0.1), transparent)",
            animation: "hud-scan 1.8s ease-in-out",
          }}
        />
      </div>

      <div className="anim-fade-up flex items-center gap-4">
        <FalconLogo size={64} />
        <div>
          <div className="mono text-4xl font-bold tracking-[0.35em] text-hud-text">
            FALCON
          </div>
          <div className="eyebrow mt-1 tracking-[0.14em]">
            FOUR-STAGE AEROENGINE LATENT COMPONENT & OPERATIONAL NETWORK
          </div>
        </div>
      </div>

      <div className="mono mt-10 flex w-[min(560px,90vw)] flex-col gap-1.5 text-xs text-hud-muted">
        {LINES.slice(0, step).map((l, i) => (
          <div key={i} className="anim-fade-up flex items-center gap-2">
            <span className="text-hud-green">▸</span>
            <span className="text-hud-text/90">{l}</span>
          </div>
        ))}
        {step < LINES.length && (
          <div className="anim-blink text-hud-cyan">▊</div>
        )}
      </div>

      <div className="absolute bottom-6 mono text-[10px] uppercase tracking-widest text-hud-muted">
        click anywhere to skip
      </div>
    </div>
  );
}
