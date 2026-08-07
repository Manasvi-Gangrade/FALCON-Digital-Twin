import { useEffect, useState } from "react";
import { Activity, LayoutGrid, Gauge, MessageSquareText, ListOrdered, ChevronLeft, ChevronRight, Database, Sliders, Network, Atom } from "lucide-react";
import { BootSequence } from "./BootSequence";
import { TopBar } from "./TopBar";
import { FleetOverview } from "./pages/FleetOverview";
import { EngineDetail } from "./pages/EngineDetail";
import { Assistant } from "./pages/Assistant";
import { PriorityBoard } from "./pages/PriorityBoard";
import { DatasetExplorer } from "./pages/DatasetExplorer";
import { WhatIfSandbox } from "./pages/WhatIfSandbox";
import { KnowledgeGraphView } from "./pages/KnowledgeGraphView";
import { PhysicsReference } from "./pages/PhysicsReference";
import { initialEngines, tickEngine, type Engine } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

import { soundFx } from "@/lib/audio-effects";

export type PageKey = "overview" | "engine" | "dataset" | "graph" | "whatif" | "physics" | "assistant" | "priority";

const NAV: { key: PageKey; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Fleet Overview", icon: LayoutGrid },
  { key: "engine", label: "Engine Detail", icon: Gauge },
  { key: "graph", label: "Reasoning Graph", icon: Network },
  { key: "whatif", label: "What-If Simulator", icon: Sliders },
  { key: "physics", label: "Physics Reference", icon: Atom },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    setMobileMenuOpen(false);
  };

  const toggleDegradation = () => {
    setEngines((prev) =>
      prev.map((e) => (e.id === selectedId ? { ...e, degraded: !e.degraded } : e)),
    );
  };

  const toggleAnomaly = (anomaly: import("@/lib/telemetry").AnomalyType) => {
    setEngines((prev) =>
      prev.map((e) => {
        if (e.id !== selectedId) return e;
        const current = e.activeAnomalies || [];
        const exists = current.includes(anomaly);
        const nextAnomalies = exists
          ? current.filter((a) => a !== anomaly)
          : [...current, anomaly];
        return {
          ...e,
          activeAnomalies: nextAnomalies,
        };
      }),
    );
  };

  const clearAnomalies = () => {
    setEngines((prev) =>
      prev.map((e) =>
        e.id === selectedId
          ? { ...e, degraded: false, activeAnomalies: [] }
          : e,
      ),
    );
  };

  if (!booted) return <BootSequence onDone={() => setBooted(true)} />;

  return (
    <div className="relative min-h-screen text-slate-200" style={{ zIndex: 2 }}>
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-slate-800 bg-[#121b2d]/95 backdrop-blur-md transition-all duration-300 ease-out",
          // Mobile state
          mobileMenuOpen ? "translate-x-0 w-64 md:translate-x-0" : "-translate-x-full md:translate-x-0",
          // Desktop width state
          sidebarOpen ? "md:w-56" : "md:w-16",
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

        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-2">
            <FalconLogo />
            {(sidebarOpen || mobileMenuOpen) && (
              <span className="mono text-sm font-bold tracking-[0.25em] text-white">FALCON</span>
            )}
          </div>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded p-1 text-slate-400 hover:text-white md:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-2">
          {NAV.map((n) => {
            const active = page === n.key;
            const Icon = n.icon;
            return (
              <button
                key={n.key}
                onClick={() => {
                  soundFx.playClick();
                  setPage(n.key);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all cursor-pointer font-bold",
                  active
                    ? "bg-sky-600 text-white shadow-md shadow-sky-950/60"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-sky-400")}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span
                  className={cn(
                    "mono text-xs tracking-wider",
                    !sidebarOpen && !mobileMenuOpen && "md:hidden",
                  )}
                >
                  {n.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setSidebarOpen((s) => !s)}
          className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-slate-700 bg-[#121b2d] p-1.5 text-slate-300 hover:text-white shadow-sm hover:border-sky-400 cursor-pointer"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {(sidebarOpen || mobileMenuOpen) && (
          <div className="absolute bottom-16 left-0 right-0 px-4">
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 mono font-bold uppercase tracking-widest bg-emerald-950/40 border border-emerald-500/30 px-2 py-1 rounded">
              <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
              LINK STABLE
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          "transition-[padding] duration-300 min-h-screen flex flex-col",
          sidebarOpen ? "md:pl-56" : "md:pl-16",
        )}
      >
        <TopBar
          engines={engines}
          selectedId={selectedId}
          onSelect={(id) => {
            soundFx.playClick();
            setSelectedId(id);
            if (page === "overview") {
              setPage("engine");
            }
          }}
          onToggleMobileMenu={() => setMobileMenuOpen((m) => !m)}
        />

        <main key={pageAnimKey} className="anim-fade-up flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-full overflow-x-hidden">
          {page === "overview" && (
            <FleetOverview engines={engines} onSelectEngine={goToEngine} />
          )}
          {page === "engine" && (
            <EngineDetail
              engine={selected}
              onToggleDegradation={toggleDegradation}
              onToggleAnomaly={toggleAnomaly}
              onClearAnomalies={clearAnomalies}
            />
          )}
          {page === "graph" && <KnowledgeGraphView engine={selected} />}
          {page === "whatif" && <WhatIfSandbox engine={selected} />}
          {page === "physics" && <PhysicsReference selectedEngine={selected} />}
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
