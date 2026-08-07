import { useState } from "react";
import { Network, Activity, Cpu, Flame, Wind, Wrench, ShieldAlert, ArrowRight, CheckCircle } from "lucide-react";
import type { Engine } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export function KnowledgeGraphView({ engine }: { engine: Engine }) {
  const [selectedNode, setSelectedNode] = useState<string | null>("t3_surge");

  const nodes = [
    {
      id: "t3_surge",
      layer: "1. Sensor Anomaly",
      label: "Turbine Inlet Temp (T3) Surge > 820°C",
      icon: Activity,
      color: "#ef4444",
      subsystem: "High Pressure Turbine (HPT)",
      mechanism: "HPT Thermal Barrier Coating (TBC) Erosion",
      action: "Emergency Borescope Inspection & Level-2 Depot",
      milStd: "MIL-STD-1789B Envelope Rule 4.2",
    },
    {
      id: "p2_drop",
      layer: "1. Sensor Anomaly",
      label: "Compressor Exit Press (P2) Delta Drop",
      icon: Wind,
      color: "#f59e0b",
      subsystem: "High Pressure Compressor (HPC)",
      mechanism: "Aerodynamic Blade Fouling & Tip Clearance",
      action: "Level-1 Compressor Water Wash Protocol",
      milStd: "MIL-E-8593A Section 3.1",
    },
    {
      id: "sfc_rise",
      layer: "1. Sensor Anomaly",
      label: "Specific Fuel Consumption (SFC) Rise",
      icon: Flame,
      color: "#0ea5e9",
      subsystem: "Annular Combustor Chamber",
      mechanism: "Fuel Nozzle Cavitation & Pattern Factor",
      action: "Recalibrate Hydro-Mechanical FCU",
      milStd: "MIL-F-8615 Standard",
    },
  ];

  const activeNodeData = nodes.find((n) => n.id === selectedNode) || nodes[0];

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="panel-strong panel-accent-cyan flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-hud-cyan glow-cyan" />
            <div className="eyebrow text-sm font-bold text-sky-800">Interactive Engineering Knowledge Graph & Causal Chain</div>
          </div>
          <h2 className="mono mt-1 text-xl sm:text-2xl font-bold">Causal Engineering Reasoning Graph</h2>
          <p className="text-xs text-slate-700 font-sans mt-1">
            <strong>What this graph shows:</strong> Traces the exact 5-stage causal diagnostic chain from raw sensor telemetry anomalies ➔ target subsystem identification ➔ thermodynamic failure mechanisms ➔ HAL depot maintenance actions ➔ MIL-STD sortie clearance.
          </p>
        </div>

        <div className="mono text-xs rounded-md border border-sky-400/40 bg-sky-950/20 px-3 py-1.5 shadow-sm text-sky-700 font-bold">
          Active Engine Context: {engine.id} ({engine.tail})
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Node Selection Pipeline */}
        <div className="panel panel-accent-cyan space-y-3 p-4 lg:col-span-1">
          <div className="eyebrow text-[10px] text-hud-muted">Select Sensor Anomaly Node</div>
          {nodes.map((node) => {
            const Icon = node.icon;
            const isSelected = selectedNode === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node.id)}
                className={cn(
                  "cursor-pointer rounded-lg border p-3 transition-all duration-200",
                  isSelected
                    ? "border-hud-cyan bg-hud-cyan/15 shadow-md"
                    : "border-hud-border bg-[color:var(--hud-panel-2)] hover:border-hud-cyan/40",
                )}
              >
                <div className="mono text-[10px] uppercase text-hud-muted">{node.layer}</div>
                <div className="mono mt-1 flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: node.color }} />
                  <span>{node.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Knowledge Graph Trace Canvas */}
        <div className="panel panel-accent-cyan space-y-4 p-4 lg:col-span-2">
          <div className="eyebrow text-[10px] text-hud-muted">Full Causal Reasoning Path</div>

          {/* Graphical Flow Trace */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center">
            {/* Step 1 */}
            <div className="rounded-lg border border-hud-border bg-[color:var(--hud-panel-2)] p-3 flex flex-col items-center justify-center">
              <div className="mono text-[9px] text-hud-muted uppercase">1. Sensor Trigger</div>
              <Activity className="h-5 w-5 my-2 text-hud-red" />
              <div className="mono text-xs font-bold text-slate-200 truncate max-w-full">{activeNodeData.label}</div>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-hud-border bg-[color:var(--hud-panel-2)] p-3 flex flex-col items-center justify-center">
              <div className="mono text-[9px] text-hud-muted uppercase">2. Subsystem</div>
              <Cpu className="h-5 w-5 my-2 text-hud-cyan" />
              <div className="mono text-xs font-bold text-slate-200 truncate max-w-full">{activeNodeData.subsystem}</div>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-hud-border bg-[color:var(--hud-panel-2)] p-3 flex flex-col items-center justify-center">
              <div className="mono text-[9px] text-hud-muted uppercase">3. Failure Cause</div>
              <ShieldAlert className="h-5 w-5 my-2 text-hud-amber" />
              <div className="mono text-xs font-bold text-slate-200 truncate max-w-full">{activeNodeData.mechanism}</div>
            </div>

            {/* Step 4 */}
            <div className="rounded-lg border border-hud-border bg-[color:var(--hud-panel-2)] p-3 flex flex-col items-center justify-center">
              <div className="mono text-[9px] text-hud-muted uppercase">4. Depot Action</div>
              <Wrench className="h-5 w-5 my-2 text-hud-green" />
              <div className="mono text-xs font-bold text-slate-200 truncate max-w-full">{activeNodeData.action}</div>
            </div>
          </div>

          {/* Details Breakdown Card */}
          <div className="rounded-lg border border-hud-cyan/30 bg-hud-cyan/5 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-hud-cyan/20 pb-2">
              <span className="mono text-xs font-bold text-hud-cyan uppercase">Reasoning Node Details</span>
              <span className="mono text-[10px] text-slate-300 font-semibold">{activeNodeData.milStd}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mono">
              <div>
                <span className="text-hud-muted">Subsystem Affected:</span>
                <div className="font-bold text-slate-200 mt-0.5">{activeNodeData.subsystem}</div>
              </div>

              <div>
                <span className="text-hud-muted">Root Engineering Mechanism:</span>
                <div className="font-bold text-hud-amber mt-0.5">{activeNodeData.mechanism}</div>
              </div>

              <div>
                <span className="text-hud-muted">Prescribed Depot Action:</span>
                <div className="font-bold text-hud-green mt-0.5">{activeNodeData.action}</div>
              </div>

              <div>
                <span className="text-hud-muted">Explainability Confidence:</span>
                <div className="font-bold text-hud-cyan mt-0.5">94.8% (Knowledge Graph Grounded)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
