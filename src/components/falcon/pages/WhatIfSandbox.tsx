import { useState, useEffect, useCallback } from "react";
import { Sliders, Play, RotateCcw, AlertTriangle, ShieldCheck, Zap, Activity, Fuel, Gauge } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from "recharts";
import type { Engine } from "@/lib/telemetry";
import { runWhatIfSimulationBackend } from "@/lib/api";
import { cn } from "@/lib/utils";

export function WhatIfSandbox({ engine }: { engine: Engine }) {
  // Input parameters
  const [altitude, setAltitude] = useState(8500); // meters
  const [mach, setMach] = useState(0.82);
  const [fuelMultiplier, setFuelMultiplier] = useState(1.0); // 1.0 = nominal
  const [rpmOverload, setRpmOverload] = useState(0); // % overload
  const [horizon, setHorizon] = useState(50); // cycles

  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<any | null>(null);

  // Generate fallback simulation locally if backend is offline
  const runSimulation = useCallback(async () => {
    setLoading(true);
    const backendRes = await runWhatIfSimulationBackend({
      altitude_m: altitude,
      mach: mach,
      fuel_multiplier: fuelMultiplier,
      rpm_overload_percent: rpmOverload,
      horizon_cycles: horizon,
    });

    if (backendRes) {
      setSimulationData(backendRes);
      setLoading(false);
      return;
    }

    // Local physics simulation fallback with engine-specific parameters
    const baseline = [];
    const hypothetical = [];
    const startHealth = engine.health;
    const baseRpm = engine.sensors.rpm && engine.sensors.rpm > 100 ? engine.sensors.rpm : 12500;

    for (let c = 1; c <= horizon; c++) {
      const bHealth = Math.max(10, startHealth - c * 0.42);
      const bThrust = 24.5 + (baseRpm / 12500) * 10;
      const bSfc = (0.85 * 3.6) / Math.max(1, bThrust / 10);

      const penalty = (fuelMultiplier - 1.0) * 1.2 + (rpmOverload / 100) * 1.8 + (altitude > 10000 ? 0.35 : 0) + (mach > 1.0 ? 0.4 : 0);
      const hHealth = Math.max(5, startHealth - c * (0.42 + penalty));
      const hThrust = (24.5 + (baseRpm / 12500) * 10) * (1 + rpmOverload / 100);
      const hSfc = (0.85 * fuelMultiplier * 3.6) / Math.max(1, hThrust / 10);

      baseline.push({ cycle: c, health: Number(bHealth.toFixed(1)), thrust: Number(bThrust.toFixed(1)), sfc: Number(bSfc.toFixed(3)) });
      hypothetical.push({ cycle: c, health: Number(hHealth.toFixed(1)), thrust: Number(hThrust.toFixed(1)), sfc: Number(hSfc.toFixed(3)) });
    }

    const rulDelta = hypothetical[hypothetical.length - 1].health - baseline[baseline.length - 1].health;

    setSimulationData({
      baseline_trajectory: baseline,
      hypothetical_trajectory: hypothetical,
      rul_delta_cycles: Number(rulDelta.toFixed(1)),
    });
    setLoading(false);
  }, [altitude, mach, fuelMultiplier, rpmOverload, horizon, engine.id, engine.health, engine.sensors.rpm]);

  // Auto-run simulation when any slider parameter or engine changes
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const resetParams = () => {
    setAltitude(8500);
    setMach(0.82);
    setFuelMultiplier(1.0);
    setRpmOverload(0);
    setHorizon(50);
  };

  const chartData = simulationData
    ? simulationData.baseline_trajectory.map((b: any, idx: number) => {
        const h = simulationData.hypothetical_trajectory[idx];
        return {
          cycle: b.cycle,
          baselineHealth: b.health,
          hypotheticalHealth: h?.health,
          baselineSfc: b.sfc,
          hypotheticalSfc: h?.sfc,
        };
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="panel-strong panel-accent-cyan flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-hud-cyan glow-cyan" />
            <div className="eyebrow">Aerothon Section 19 & 29 · What-If Counterfactual Sandbox</div>
          </div>
          <h2 className="mono mt-1 text-xl sm:text-2xl font-bold">Hypothetical Operational Scenario Simulator</h2>
          <p className="mono text-xs text-hud-muted">
            Simulate how custom flight envelopes, altitude shifts, and thermal overload impact 50-cycle RUL degradation trajectories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetParams}
            className="mono flex items-center gap-1.5 rounded-md border border-hud-border bg-[color:var(--hud-panel)] px-3 py-2 text-xs font-semibold text-hud-muted hover:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            onClick={runSimulation}
            disabled={loading}
            className="mono flex items-center gap-2 rounded-md border border-hud-cyan bg-hud-cyan/20 px-4 py-2 text-xs font-bold text-hud-cyan shadow-md hover:bg-hud-cyan/30 transition-all"
          >
            <Play className="h-4 w-4 fill-current" />
            {loading ? "Simulating Physics..." : "Execute Simulation"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Controls Column */}
        <div className="panel panel-accent-cyan space-y-4 p-4 lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-hud-border pb-2">
            <Zap className="h-4 w-4 text-hud-cyan" />
            <span className="mono text-xs font-bold uppercase tracking-wider">Flight & Operational Parameters</span>
          </div>

          {/* Altitude Slider */}
          <div className="space-y-1.5">
            <div className="mono flex justify-between text-xs">
              <span className="text-hud-muted">Altitude (m):</span>
              <span className="font-bold text-hud-cyan">{altitude.toLocaleString()} m</span>
            </div>
            <input
              type="range"
              min="0"
              max="15000"
              step="500"
              value={altitude}
              onChange={(e) => setAltitude(Number(e.target.value))}
              className="w-full accent-hud-cyan"
            />
            <div className="mono flex justify-between text-[10px] text-hud-muted">
              <span>Sea Level (0m)</span>
              <span>15,000m (Ceiling)</span>
            </div>
          </div>

          {/* Mach Number Slider */}
          <div className="space-y-1.5">
            <div className="mono flex justify-between text-xs">
              <span className="text-hud-muted">Mach Speed:</span>
              <span className="font-bold text-hud-cyan">M {mach.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.8"
              step="0.05"
              value={mach}
              onChange={(e) => setMach(Number(e.target.value))}
              className="w-full accent-hud-cyan"
            />
            <div className="mono flex justify-between text-[10px] text-hud-muted">
              <span>Subsonic (0.2M)</span>
              <span>Supersonic (1.8M)</span>
            </div>
          </div>

          {/* Fuel Multiplier Slider */}
          <div className="space-y-1.5">
            <div className="mono flex justify-between text-xs">
              <span className="text-hud-muted">Fuel Flow Rate Multiplier:</span>
              <span className={cn("font-bold", fuelMultiplier > 1.1 ? "text-hud-amber" : "text-hud-cyan")}>
                {fuelMultiplier.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={fuelMultiplier}
              onChange={(e) => setFuelMultiplier(Number(e.target.value))}
              className="w-full accent-hud-cyan"
            />
          </div>

          {/* RPM Overload Slider */}
          <div className="space-y-1.5">
            <div className="mono flex justify-between text-xs">
              <span className="text-hud-muted">Shaft Speed Overload (%):</span>
              <span className={cn("font-bold", rpmOverload > 5 ? "text-hud-red" : "text-hud-cyan")}>
                +{rpmOverload}% RPM
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="15"
              step="1"
              value={rpmOverload}
              onChange={(e) => setRpmOverload(Number(e.target.value))}
              className="w-full accent-hud-cyan"
            />
          </div>

          {/* Horizon Cycles */}
          <div className="space-y-1.5 pt-2">
            <div className="mono flex justify-between text-xs">
              <span className="text-hud-muted">Prediction Horizon:</span>
              <span className="font-bold text-hud-cyan">{horizon} Cycles</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="10"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full accent-hud-cyan"
            />
          </div>
        </div>

        {/* Results Graph Column */}
        <div className="panel panel-accent-cyan space-y-4 p-4 lg:col-span-2">
          {!simulationData ? (
            <div className="flex h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-hud-border bg-[color:var(--hud-panel-2)] p-6 text-center">
              <Sliders className="h-10 w-10 text-hud-cyan/40" />
              <h3 className="mono mt-3 text-base font-bold">No Active Simulation Execution</h3>
              <p className="mono mt-1 max-w-md text-xs text-hud-muted">
                Adjust flight parameters on the left and click <span className="text-hud-cyan">"Execute Simulation"</span> to run counterfactual PINN trajectory analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-hud-border bg-[color:var(--hud-panel-2)] p-3">
                  <div className="mono text-[10px] text-hud-muted uppercase">Projected RUL Delta</div>
                  <div className={cn("mono text-xl font-bold mt-0.5", simulationData.rul_delta_cycles >= 0 ? "text-hud-green" : "text-hud-red")}>
                    {simulationData.rul_delta_cycles >= 0 ? "+" : ""}{simulationData.rul_delta_cycles} Cycles
                  </div>
                  <div className="mono text-[10px] text-hud-muted mt-1">vs Baseline Flight Profile</div>
                </div>

                <div className="rounded-lg border border-hud-border bg-[color:var(--hud-panel-2)] p-3">
                  <div className="mono text-[10px] text-hud-muted uppercase">Fuel Burn Penalty</div>
                  <div className="mono text-xl font-bold text-hud-amber mt-0.5">
                    {((fuelMultiplier - 1.0) * 100).toFixed(1)}%
                  </div>
                  <div className="mono text-[10px] text-hud-muted mt-1">Specific Fuel Consumption</div>
                </div>

                <div className="rounded-lg border border-hud-border bg-[color:var(--hud-panel-2)] p-3">
                  <div className="mono text-[10px] text-hud-muted uppercase">Thermal Envelope Risk</div>
                  <div className="mono text-xl font-bold text-hud-cyan mt-0.5 flex items-center gap-1.5">
                    {rpmOverload > 5 || fuelMultiplier > 1.15 ? (
                      <span className="text-hud-red flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" /> HIGH
                      </span>
                    ) : (
                      <span className="text-hud-green flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4" /> LOW
                      </span>
                    )}
                  </div>
                  <div className="mono text-[10px] text-hud-muted mt-1">MIL-STD-1789B Assessment</div>
                </div>
              </div>

              {/* Comparative Trajectory Chart */}
              <div className="panel p-3">
                <div className="mono text-xs font-bold text-hud-muted mb-2">
                  50-Cycle Engine Health Trajectory (Nominal Baseline vs Hypothetical Envelope)
                </div>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="baseArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="hypoArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="cycle" stroke="#8b93a7" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="#8b93a7" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          background: "#162035",
                          border: "1px solid #1e293b",
                          borderRadius: "6px",
                          fontSize: 11,
                          color: "#f8fafc",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" name="Nominal Baseline Health" dataKey="baselineHealth" stroke="#0ea5e9" strokeWidth={2} fill="url(#baseArea)" />
                      <Area type="monotone" name="Hypothetical Scenario Health" dataKey="hypotheticalHealth" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" fill="url(#hypoArea)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
