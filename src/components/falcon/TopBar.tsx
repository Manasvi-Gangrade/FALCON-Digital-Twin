import { ChevronDown } from "lucide-react";
import { useUtcClock } from "@/lib/use-utc-clock";
import type { Engine } from "@/lib/telemetry";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusDot } from "./StatusDot";

export function TopBar({
  engines,
  selectedId,
  onSelect,
}: {
  engines: Engine[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const clock = useUtcClock();
  const [open, setOpen] = useState(false);
  const selected = engines.find((e) => e.id === selectedId) ?? engines[0];

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-hud-border bg-[#121b2d]/85 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="mono text-[10px] uppercase tracking-[0.3em] text-slate-400">
          Mission Control · Sector IV
        </div>
      </div>

      <div className="relative flex items-center gap-4">
        {/* Engine selector */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-md border border-hud-border bg-[color:var(--hud-panel)] px-3 py-1.5 text-xs hover:border-hud-cyan/40 shadow-sm text-slate-800"
        >
          <StatusDot severity={selected.severity} />
          <span className="mono font-semibold">{selected.id}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{selected.tail}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform text-slate-500", open && "rotate-180")} />
        </button>

        {open && (
          <div
            className="anim-fade-up absolute right-32 top-12 z-30 min-w-[260px] rounded-md border border-hud-border bg-[color:var(--hud-panel)] p-1 shadow-lg text-slate-800"
          >
            {engines.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  onSelect(e.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs hover:bg-slate-100",
                  e.id === selectedId && "bg-slate-50",
                )}
              >
                <StatusDot severity={e.severity} />
                <span className="mono font-semibold">{e.id}</span>
                <span className="text-slate-500">{e.tail}</span>
                <span className="mono ml-auto text-slate-400">{e.health.toFixed(0)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mono text-xs text-slate-100 tabular-nums">{clock}</div>

        <div className="flex items-center gap-2 rounded-full border border-hud-cyan/20 bg-hud-cyan/5 px-2.5 py-1">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span
              className="absolute rounded-full border anim-pulse-ring"
              style={{ borderColor: "var(--hud-cyan)", width: "16px", height: "16px" }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: "var(--hud-cyan)" }}
            />
          </span>
          <span className="mono text-[10px] font-bold uppercase tracking-widest text-hud-cyan">
            LIVE
          </span>
        </div>
      </div>
    </header>
  );
}
