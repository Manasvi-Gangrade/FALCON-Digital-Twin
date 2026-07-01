import { useEffect, useState } from "react";
import { Activity, LayoutGrid, Gauge, MessageSquareText, ListOrdered, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { BootSequence } from "./BootSequence";
import { TopBar } from "./TopBar";
import { FleetOverview } from "./pages/FleetOverview";
import { EngineDetail } from "./pages/EngineDetail";
import { Assistant } from "./pages/Assistant";
import { PriorityBoard } from "./pages/PriorityBoard";
import { DatasetExplorer } from "./pages/DatasetExplorer";
import { initialEngines, tickEngine, type Engine } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export type PageKey = "overview" | "engine" | "assistant" | "priority" | "dataset";

const NAV: { key: PageKey; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Fleet Overview", icon: LayoutGrid },
  { key: "engine", label: "Engine Detail", icon: Gauge },
  { key: "dataset", label: "Dataset Explorer", icon: Database },
  { key: "assistant", label: "AI Assistant", icon: MessageSquareText },
  { key: "priority", label: "Priority Board", icon: ListOrdered },
];

export function FalconApp() {
  const [booted, setBooted] = useState(false);
  const [page, setPage] = useState<PageKey>("overview");
  const [engines, setEngines] = useState<Engine[]>(() => initialEngines());
  const [selectedId, setSelectedId] = useState<string>("TJ-04C");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pageAnimKey, setPageAnimKey] = useState(0);

  // live telemetry tick
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      t += 1;
      setEngines((prev) => prev.map((e) => tickEngine(e, t)));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setPageAnimKey((k) => k + 1);
  }, [page, selectedId]);

  const selected = engines.find((e) => e.id === selectedId) ?? engines[0];

  const goToEngine = (id: string) => {
    setSelectedId(id);
    setPage("engine");
  };

  const toggleDegradation = () => {
    setEngines((prev) =>
      prev.map((e) => (e.id === selectedId ? { ...e, degraded: !e.degraded } : e)),
    );
  };

  if (!booted) return <BootSequence onDone={() => setBooted(true)} />;

  return (
    <div className="relative min-h-screen text-slate-200" style={{ zIndex: 2 }}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 h-screen border-r border-hud-border bg-[#0b1220]/95 backdrop-blur-md transition-[width] duration-300 ease-out",
          sidebarOpen ? "w-56" : "w-16",
        )}
      >
        {/* Signal heartbeat line */}
        <div className="absolute right-0 top-0 h-full w-px overflow-hidden">
          <div
            className="absolute left-0 h-16 w-px"
            style={{
              background: "linear-gradient(to bottom, transparent, var(--hud-cyan), transparent)",
              animation: "hud-signal 4.5s ease-in-out infinite",
            }}
          />
        </div>

        <div className="flex h-14 items-center gap-2 border-b border-hud-border px-4">
          <FalconLogo />
          {sidebarOpen && (
            <span className="mono text-sm font-bold tracking-[0.25em] text-white">FALCON</span>
          )}
        </div>

        <nav className="flex flex-col gap-1 p-2">
          {NAV.map((n) => {
            const active = page === n.key;
            const Icon = n.icon;
            return (
              <button
                key={n.key}
                onClick={() => setPage(n.key)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-hud-cyan/15 text-hud-cyan font-bold"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
                )}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r"
                    style={{ background: "var(--hud-cyan)" }}
                  />
                )}
                <Icon
                  className={cn("h-4 w-4 shrink-0", active && "glow-cyan")}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {sidebarOpen && (
                  <span className="eyebrow" style={{ color: "inherit", letterSpacing: "0.14em" }}>
                    {n.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => setSidebarOpen((s) => !s)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-hud-border bg-[#0b1220] p-1.5 text-slate-400 hover:text-hud-cyan shadow-sm hover:border-hud-cyan/50"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {sidebarOpen && (
          <div className="absolute bottom-16 left-0 right-0 px-4">
            <div className="flex items-center gap-2 text-[10px] text-hud-muted mono uppercase tracking-widest">
              <Activity className="h-3 w-3 text-hud-green" />
              LINK STABLE
            </div>
          </div>
        )}
      </aside>

      <div className={cn("transition-[padding] duration-300", sidebarOpen ? "pl-56" : "pl-16")}>
        <TopBar
          engines={engines}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
          }}
        />

        <main key={pageAnimKey} className="anim-fade-up px-6 py-6">
          {page === "overview" && (
            <FleetOverview engines={engines} onSelectEngine={goToEngine} />
          )}
          {page === "engine" && (
            <EngineDetail
              engine={selected}
              onToggleDegradation={toggleDegradation}
            />
          )}
          {page === "assistant" && <Assistant engine={selected} />}
          {page === "priority" && (
            <PriorityBoard engines={engines} onOpenEngine={goToEngine} />
          )}
          {page === "dataset" && <DatasetExplorer />}
        </main>
      </div>
    </div>
  );
}

export function FalconLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="glow-cyan">
      <defs>
        <linearGradient id="falcon-g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <path
        d="M4 22 L16 6 L28 22 L22 22 L16 14 L10 22 Z"
        fill="url(#falcon-g)"
        stroke="url(#falcon-g)"
        strokeWidth="0.5"
      />
      <circle cx="16" cy="25" r="1.6" fill="#0ea5e9" />
    </svg>
  );
}
