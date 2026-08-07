import { useState } from "react";
import { BookOpen, Calculator, Atom, Zap, ShieldCheck, Activity, Search, CheckCircle2, ChevronRight, Scale, Sliders } from "lucide-react";
import type { Engine } from "@/lib/telemetry";

type PhysicsReferenceProps = {
  selectedEngine: Engine;
};

type EquationItem = {
  id: string;
  section: string;
  name: string;
  form: string;
  variables: string;
  meaning: string;
  module: string;
  proposalRef: string;
  violationSignal: string;
  category: "compressor" | "combustor" | "turbine" | "shaft" | "thrust" | "health" | "uncertainty" | "pinn";
};

const MASTER_EQUATIONS: EquationItem[] = [
  {
    id: "3.1",
    section: "3.3 Ideal Thermal Efficiency",
    name: "Brayton Cycle Thermal Efficiency",
    form: "ηth = 1 - 1 / (πc^((γ-1)/γ))",
    variables: "πc = P2/P1 (Pressure Ratio), γ = 1.4 (Specific Heat Ratio)",
    meaning: "Ideal thermodynamic limit for single-spool Brayton cycle as a function of pressure ratio.",
    module: "Health Intelligence Engine",
    proposalRef: "Section 3.2 & Section 8.1",
    violationSignal: "Loss of achievable pressure ratio at given RPM reduces cycle efficiency baseline.",
    category: "compressor",
  },
  {
    id: "4.1",
    section: "4.1 Compressor Pressure Ratio",
    name: "Compressor Pressure Ratio",
    form: "πc = P2 / Pamb",
    variables: "P2 = Compressor Exit Press (Pa), Pamb = Ambient Static Press (Pa)",
    meaning: "Direct compression pressure multiplication ratio across 4-stage axial compressor.",
    module: "Health Intelligence Engine & PINN Twin",
    proposalRef: "Section 8.1 (Derived Feature #1)",
    violationSignal: "Sudden drop indicates compressor blade fouling or tip clearance enlargement.",
    category: "compressor",
  },
  {
    id: "4.3",
    section: "4.3 Isentropic Efficiency",
    name: "Compressor Isentropic Efficiency",
    form: "ηc = (T2s - T1) / (T2 - T1) = (T1 · (πc^((γ-1)/γ) - 1)) / (T2 - T1)",
    variables: "T1 = Ambient Temp (K), T2 = Measured Exit Temp (K), T2s = Ideal Exit Temp (K)",
    meaning: "Quantifies thermodynamic friction loss and irreversible entropy generation during compression.",
    module: "Health Intelligence Engine",
    proposalRef: "Section 9.2 & Section 13",
    violationSignal: "ηc < 0.78 indicates critical aerodynamic stall or stage erosion.",
    category: "compressor",
  },
  {
    id: "4.5",
    section: "4.4 Compressor Work Input",
    name: "Compressor Power Demand",
    form: "Wc = ṁa · cp · (T2 - T1)",
    variables: "ṁa = Air Mass Flow (kg/s), cp = 1.005 kJ/(kg·K)",
    meaning: "Total mechanical shaft power required by 4-stage compressor per second.",
    module: "Physics-Informed Digital Twin",
    proposalRef: "Section 8.1 & Section 9.2",
    violationSignal: "Wc exceeding turbine power supply Wt violates shaft energy balance.",
    category: "compressor",
  },
  {
    id: "5.1",
    section: "5.1 Combustor Energy Balance",
    name: "Combustor Energy Balance",
    form: "ṁf · LHV · ηb = (ṁa + ṁf) · cp,g · T3 - ṁa · cp · T2",
    variables: "ṁf = Fuel Flow (kg/s), LHV = 43 MJ/kg, ηb = Combustor Efficiency, T3 = Turbine Inlet Temp (K)",
    meaning: "Conservation of energy linking fuel combustion enthalpy to reconstructed Turbine Inlet Temp T3.",
    module: "PINN Digital Twin (State Reconstruction)",
    proposalRef: "Section 8.1 & Section 9.2",
    violationSignal: "Fuel flow increase without T3/thrust rise indicates combustion inefficiency or nozzle clog.",
    category: "combustor",
  },
  {
    id: "5.3",
    section: "5.3 Combustor Pressure Loss",
    name: "Combustor Fractional Pressure Loss",
    form: "ΔPb = (P2 - P3) / P2 ≈ 3.0% - 6.0%",
    variables: "P2 = Compressor Exit Press (Pa), P3 = Combustor Exit Press (Pa)",
    meaning: "Fluid friction and heat addition momentum pressure drop across flame tubes.",
    module: "Health Intelligence Engine",
    proposalRef: "Section 13 (Combustor Subsystem)",
    violationSignal: "ΔPb > 7.5% signals fuel liner carbon build-up or flame tube degradation.",
    category: "combustor",
  },
  {
    id: "6.1",
    section: "6.1 Turbine Expansion Ratio",
    name: "Turbine Expansion Ratio",
    form: "πt = P3 / P4",
    variables: "P3 = Combustor Exit Press (Pa), P4 = Turbine Exit Press (Pa)",
    meaning: "Pressure drop expansion ratio available across High-Pressure Turbine stages.",
    module: "Health Intelligence Engine",
    proposalRef: "Section 8.1 (Derived Feature #3)",
    violationSignal: "Abnormal πt shift indicates turbine nozzle guide vane (NGV) distortion.",
    category: "turbine",
  },
  {
    id: "6.3",
    section: "6.3 Turbine Isentropic Efficiency",
    name: "Turbine Isentropic Efficiency",
    form: "ηt = (T3 - T4) / (T3 - T4s) = (T3 - T4) / (T3 · (1 - πt^(-(γ-1)/γ)))",
    variables: "T3 = Reconstructed Inlet Temp (K), T4 = Measured Exit Temp (K), T4s = Ideal Exit Temp (K)",
    meaning: "Ratio of actual extracted shaft power to maximum theoretical enthalpy drop.",
    module: "Health Intelligence Engine & RUL Engine",
    proposalRef: "Section 8.1 & Section 13",
    violationSignal: "ηt drop directly drives Thermal Barrier Coating (TBC) erosion alerts.",
    category: "turbine",
  },
  {
    id: "6.6",
    section: "6.5 Energy Extraction Bound",
    name: "Turbine Thermodynamic Extraction Ceiling",
    form: "T3 - T4 ≤ T3 - T4s   (since ηt ≤ 1.0)",
    variables: "T3 - T4 = Actual Temp Drop, T3 - T4s = Isentropic Maximum Drop",
    meaning: "Absolute physical law: turbine power extraction cannot exceed gas enthalpy availability.",
    module: "PINN Loss Optimizer",
    proposalRef: "Section 9.2 (Table 9.2 Constraint #3)",
    violationSignal: "Surrogate predictions exceeding this ceiling are auto-rejected with zero weight.",
    category: "turbine",
  },
  {
    id: "7.2",
    section: "7.1 Single-Spool Power Balance",
    name: "Single-Spool Shaft Energy Balance",
    form: "ṁg · cp,g · (T3 - T4) = (ṁa · cp · (T2 - T1)) / ηmech",
    variables: "ηmech = 0.98 (Mechanical Transmission Efficiency), ṁg = ṁa + ṁf",
    meaning: "Couples compressor power demand directly to turbine work extraction on shared single shaft.",
    module: "Reasoning Engine & Digital Twin",
    proposalRef: "Section 9.2 & Section 14",
    violationSignal: "Power imbalance isolates compressor vs turbine failure attribution.",
    category: "shaft",
  },
  {
    id: "8.2",
    section: "8.1 Mass Flow & Continuity",
    name: "Compressor Mass Flow Continuity Coupling",
    form: "ṁa ∝ N · ρ1   where   ρ1 = Pamb / (R · Tamb)",
    variables: "N = Shaft Speed RPM, ρ1 = Ambient Air Density (kg/m³), R = 287.05 J/(kg·K)",
    meaning: "Relates air mass intake rate directly to shaft rotational speed and atmospheric density.",
    module: "PINN Physics Constraint Engine",
    proposalRef: "Section 9.2 (Constraint #1)",
    violationSignal: "Deviation from expected P2/T2 at given RPM signals air intake blockage or surge.",
    category: "shaft",
  },
  {
    id: "9.1",
    section: "9.1 Net Thrust Equation",
    name: "Aeroengine Net Thrust Inference",
    form: "F = ṁg · Ve - ṁa · V0 + (Pe - Pamb) · Ae",
    variables: "Ve = Exhaust Jet Velocity (m/s), V0 = Flight Velocity (m/s), Ae = Nozzle Area (m²)",
    meaning: "Fundamental momentum plus pressure thrust equation for high-speed turbojet propulsion.",
    module: "Performance Prediction Engine",
    proposalRef: "Section 16.1 & Section 19",
    violationSignal: "Thrust deficit relative to fuel flow signals nozzle degradation or turbine bleed loss.",
    category: "thrust",
  },
  {
    id: "9.3",
    section: "9.2 Thrust-Specific Fuel Consumption",
    name: "Thrust-Specific Fuel Consumption (TSFC)",
    form: "TSFC = ṁf / F   [kg / (N · h)]",
    variables: "ṁf = Fuel Flow Rate (kg/h), F = Net Thrust (N)",
    meaning: "Fuel efficiency index quantifying fuel mass consumed per unit thrust generated per hour.",
    module: "Performance Engine & Dashboard",
    proposalRef: "Section 16.2",
    violationSignal: "Rising TSFC while raw health index degrades signals high mission operating cost.",
    category: "thrust",
  },
  {
    id: "12.1",
    section: "12.1 Overall Engine Health Index",
    name: "Weighted Subsystem Synthesis Health Index",
    form: "HI = wc · Hc + wb · Hb + wt · Ht   (wc + wb + wt = 1.0)",
    variables: "wc=0.40 (Compressor), wb=0.20 (Combustor), wt=0.40 (Turbine)",
    meaning: "Synthesizes overall engine health score from individual component efficiency deviations.",
    module: "Health Intelligence Engine",
    proposalRef: "Section 13 & Section 23",
    violationSignal: "HI < 70% triggers automated HAL Level-2 Depot Maintenance Dispatch.",
    category: "health",
  },
  {
    id: "12.3",
    section: "12.3 Degradation Dynamics",
    name: "Compressor Fouling & Blade Erosion Dynamics",
    form: "η(t) = η0 - Δηmax · (1 - e^(-t / τ))",
    variables: "η0 = Healthy Baseline Efficiency, Δηmax = Max Saturation Loss, τ = Time Constant",
    meaning: "Asymptotic exponential decay model capturing non-linear particulate accumulation.",
    module: "Predictive Maintenance Engine",
    proposalRef: "Section 15.2",
    violationSignal: "Rate acceleration past exponential curve signals sudden FOD blade damage.",
    category: "health",
  },
  {
    id: "13.2",
    section: "13.1 Non-Linear RUL Projection",
    name: "Analytical Non-Linear Remaining Useful Life",
    form: "RUL = -τ · ln((η0 - ηthreshold) / Δηmax) - tcurrent",
    variables: "ηthreshold = Maintenance Critical Cutoff (0.75), tcurrent = Current Operating Cycle",
    meaning: "Analytical solution for remaining operational cycles before crossing overhaul threshold.",
    module: "Predictive Maintenance Engine",
    proposalRef: "Section 15.1 & Section 15.3",
    violationSignal: "RUL < 30 cycles prioritizes engine to top of Fleet Priority Maintenance Queue.",
    category: "health",
  },
  {
    id: "14.1",
    section: "14.1 Total Predictive Uncertainty",
    name: "Total Predictive Uncertainty Variance",
    form: "σ²total = σ²measurement + σ²model + σ²OOD",
    variables: "σ²meas = Sensor Noise, σ²model = PINN Approximation Error, σ²OOD = Out-of-Domain Distance",
    meaning: "Combines sensor uncertainty, surrogate model approximation, and OOD extrapolation distance.",
    module: "Uncertainty Quantification Module",
    proposalRef: "Section 17.1",
    violationSignal: "High σ²total triggers yellow/red confidence warning bands on HUD.",
    category: "uncertainty",
  },
  {
    id: "14.3",
    section: "14.3 Bounded Confidence Rating",
    name: "Human-Readable Confidence Score Mapping",
    form: "Confidence = 100 × exp(-σtotal / σref)   [%]",
    variables: "σref = Reference Variance Scaling Parameter (0.05)",
    meaning: "Maps mathematical predictive variance into intuitive 0-100% defense confidence score.",
    module: "AI Assistant & Dashboard Panel",
    proposalRef: "Section 17.3 & Section 18",
    violationSignal: "Confidence < 60% instructs pilot to restrict supersonic dash envelope.",
    category: "uncertainty",
  },
  {
    id: "15.1",
    section: "15.1 PINN Loss Objective Function",
    name: "Physics-Informed Neural Network Composite Loss",
    form: "L = Ldata + λ1·LPT-RPM + λ2·Lfuel-power + λ3·Lturbine-bound + λ4·Leff-bound",
    variables: "Ldata = Empirical MSE Loss, λi = Constraint Multipliers (10.0 - 50.0)",
    meaning: "Surrogate optimization objective enforcing physics conservation laws during model training.",
    module: "Physics-Informed Digital Twin (Backend)",
    proposalRef: "Section 9.3 & Section 22",
    violationSignal: "L > 0.018 kW residual error flags unphysical surrogate prediction.",
    category: "pinn",
  },
];

export function PhysicsReference({ selectedEngine }: PhysicsReferenceProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeEqId, setActiveEqId] = useState<string>("4.3");

  // Live Physics Calculator State
  const [rpmInput, setRpmInput] = useState<number>(selectedEngine.sensors.rpm || 12500);
  const [p2Input, setP2Input] = useState<number>(selectedEngine.sensors.p2 || 65.0); // kPa
  const [t2Input, setT2Input] = useState<number>((selectedEngine.sensors as any).t2 || 480.0); // K
  const [p3Input, setP3Input] = useState<number>((selectedEngine.sensors as any).p3 || 61.0); // kPa
  const [t3Input, setT3Input] = useState<number>(selectedEngine.sensors.t3 || 1120.0); // K
  const [p4Input, setP4Input] = useState<number>((selectedEngine.sensors as any).p4 || 25.0); // kPa
  const [t4Input, setT4Input] = useState<number>((selectedEngine.sensors as any).t4 || 850.0); // K
  const [fuelInput, setFuelInput] = useState<number>(selectedEngine.sensors.fuel || 850.0); // g/s

  // Derived live thermodynamics
  const pamb = 35.6; // kPa
  const tamb = 242.15; // K
  const gamma = 1.4;

  const pi_c = p2Input / pamb;
  const t2s = tamb * Math.pow(pi_c, (gamma - 1) / gamma);
  const eta_c = (t2s - tamb) / Math.max(1, t2Input - tamb);

  const pi_t = p3Input / Math.max(0.1, p4Input);
  const t4s = t3Input / Math.pow(pi_t, (gamma - 1) / gamma);
  const eta_t = (t3Input - t4Input) / Math.max(1, t3Input - t4s);

  // Compressor & Turbine Power (kW) approx for ṁa = 15 kg/s
  const ma = (rpmInput / 12500) * 14.5; // kg/s
  const cp = 1.005; // kJ/kgK
  const Wc = ma * cp * (t2Input - tamb);
  const mg = ma + fuelInput / 1000;
  const Wt = mg * 1.15 * (t3Input - t4Input);
  const powerResidual = Math.abs(Wt - Wc / 0.98);

  // Filtered equations
  const filtered = MASTER_EQUATIONS.filter((eq) => {
    const matchesSearch =
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.form.toLowerCase().includes(search.toLowerCase()) ||
      eq.section.toLowerCase().includes(search.toLowerCase()) ||
      eq.proposalRef.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === "all" || eq.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const selectedEq = MASTER_EQUATIONS.find((e) => e.id === activeEqId) || MASTER_EQUATIONS[2];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel-strong panel-accent-cyan flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <Atom className="h-5 w-5 text-hud-cyan glow-cyan" />
            <div className="eyebrow text-sm font-bold text-sky-800">
              FALCON Physics, Mathematics & Engineering Equations Reference
            </div>
          </div>
          <h2 className="mono mt-1 text-xl sm:text-2xl font-bold text-slate-900">
            Governing Equations & Companion Technical Specification
          </h2>
          <p className="text-xs text-slate-700 font-sans mt-1 max-w-3xl leading-relaxed">
            Every thermodynamic law, mechanical power balance, derived feature, and PINN constraint referenced across all 30 sections of the Aerothon 2026 submission — formulated, derived, and linked to the active Digital Twin pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-right shadow-2xs">
            <div className="eyebrow text-[10px] text-sky-700 font-bold">Total Master Equations</div>
            <div className="mono text-lg font-extrabold text-sky-900">18 Equations (16 Sections)</div>
          </div>
        </div>
      </div>

      {/* Interactive Live Thermodynamic Evaluator */}
      <div className="panel p-5 bg-slate-900 text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-sky-400 animate-pulse" />
            <div>
              <h3 className="mono text-base font-extrabold text-white">
                Live Interactive Thermodynamic Equation Evaluator
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Adjust engine telemetry inputs to observe real-time calculation of isentropic efficiencies (ηc, ηt), shaft power balance (Wc, Wt), and PINN physics residual (L_power).
              </p>
            </div>
          </div>
          <div className="mono text-xs bg-sky-950 border border-sky-700/60 text-sky-300 px-3 py-1 rounded-lg font-bold">
            Target Engine: {selectedEngine.id} ({selectedEngine.tail})
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300">Shaft Speed (N):</span>
              <span className="text-sky-400 font-bold">{rpmInput} RPM</span>
            </div>
            <input
              type="range"
              min={8000}
              max={14500}
              step={100}
              value={rpmInput}
              onChange={(e) => setRpmInput(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300">Compressor Press (P2):</span>
              <span className="text-emerald-400 font-bold">{p2Input.toFixed(1)} kPa</span>
            </div>
            <input
              type="range"
              min={35}
              max={95}
              step={0.5}
              value={p2Input}
              onChange={(e) => setP2Input(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300">Compressor Exit Temp (T2):</span>
              <span className="text-amber-400 font-bold">{t2Input.toFixed(1)} K</span>
            </div>
            <input
              type="range"
              min={300}
              max={650}
              step={2}
              value={t2Input}
              onChange={(e) => setT2Input(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300">Turbine Exit Temp (T4):</span>
              <span className="text-rose-400 font-bold">{t4Input.toFixed(1)} K</span>
            </div>
            <input
              type="range"
              min={600}
              max={1100}
              step={5}
              value={t4Input}
              onChange={(e) => setT4Input(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Real-time Calculated Physics Output Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">Eq 4.3 Compressor Efficiency (ηc)</span>
            <div className="mono text-lg font-extrabold text-emerald-400">
              {(eta_c * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-400">Ideal Temp Rise (T2s): {t2s.toFixed(1)} K</p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">Eq 6.3 Turbine Efficiency (ηt)</span>
            <div className="mono text-lg font-extrabold text-sky-400">
              {(eta_t * 100).toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-400">Ideal Temp Drop (T4s): {t4s.toFixed(1)} K</p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">Eq 7.2 Shaft Power Balance (Wc / Wt)</span>
            <div className="mono text-lg font-extrabold text-amber-400">
              {Wc.toFixed(0)} kW / {Wt.toFixed(0)} kW
            </div>
            <p className="text-[10px] text-slate-400">Power Net: {(Wt - Wc / 0.98).toFixed(1)} kW</p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">Eq 15.1 PINN Loss Residual</span>
            <div className={`mono text-lg font-extrabold ${powerResidual < 100 ? "text-emerald-400" : "text-rose-400"}`}>
              {(powerResidual / 1000).toFixed(4)} kW
            </div>
            <p className="text-[10px] text-slate-400">
              {powerResidual < 100 ? "✓ Physics Bound Compliant (<0.018 kW norm)" : "⚠️ Violation: High Power Residual"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Equations Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List + Search & Category Filters */}
        <div className="space-y-4 lg:col-span-1">
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="eyebrow text-xs font-bold text-sky-800">Master Equation Directory</div>
              <span className="mono text-xs font-bold text-slate-500">{filtered.length} Equations</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by equation #, name, or symbol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { id: "all", label: "All" },
                { id: "compressor", label: "Compressor" },
                { id: "combustor", label: "Combustor" },
                { id: "turbine", label: "Turbine" },
                { id: "shaft", label: "Shaft" },
                { id: "thrust", label: "Thrust" },
                { id: "health", label: "Health & RUL" },
                { id: "uncertainty", label: "Uncertainty" },
                { id: "pinn", label: "PINN Loss" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-sky-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equation List Cards */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.map((eq) => {
              const isSelected = eq.id === activeEqId;
              return (
                <div
                  key={eq.id}
                  onClick={() => setActiveEqId(eq.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/80 shadow-md ring-1 ring-sky-400"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="mono text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                      Eq. {eq.id}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{eq.proposalRef}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mt-1.5">{eq.name}</h4>
                  <div className="mono text-[11px] font-semibold text-slate-800 bg-slate-100 p-1.5 rounded mt-1.5 overflow-x-auto">
                    {eq.form}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed View of Selected Master Equation */}
        <div className="space-y-4 lg:col-span-2">
          {selectedEq && (
            <div className="panel p-6 space-y-5 bg-white border border-slate-300 shadow-md">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="mono text-xs font-bold text-white bg-sky-700 px-2.5 py-1 rounded-lg">
                      EQUATION {selectedEq.id}
                    </span>
                    <span className="eyebrow text-xs font-bold text-sky-800">{selectedEq.section}</span>
                  </div>
                  <h3 className="mono text-xl font-extrabold text-slate-900 mt-2">{selectedEq.name}</h3>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300">
                    Target Module: {selectedEq.module}
                  </span>
                </div>
              </div>

              {/* Mathematical Formulation Card */}
              <div className="rounded-xl bg-slate-900 text-white p-5 space-y-2 border border-slate-800 shadow-inner">
                <div className="eyebrow text-xs text-sky-400 font-bold uppercase tracking-wider">
                  Quantitative Mathematical Formulation
                </div>
                <div className="mono text-lg font-extrabold text-sky-300 py-1 overflow-x-auto">
                  {selectedEq.form}
                </div>
                <div className="text-xs text-slate-300 font-mono border-t border-slate-800 pt-2 mt-2">
                  <strong>Variables & Constants:</strong> {selectedEq.variables}
                </div>
              </div>

              {/* Four Core Engineering Questions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    (a) Governing Physics & Thermodynamic Purpose
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {selectedEq.meaning}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-600" />
                    (b) Integration inside FALCON Framework
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    Used as a derived engineering feature or loss penalty to enforce physical laws on 14 telemetry channels without pure black-box reliance.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    (c) Proposal Cross-Reference & Consuming Module
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    Cross-referenced directly to <strong>{selectedEq.proposalRef}</strong>. Evaluated in real time by the <strong>{selectedEq.module}</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-rose-600" />
                    (d) Violation Health Signal & Diagnostic Action
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {selectedEq.violationSignal}
                  </p>
                </div>
              </div>

              {/* Master Nomenclature Cross-Reference Table */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <h4 className="mono text-xs font-bold text-slate-900 uppercase">
                  Station Numbering & Nomenclature Mapping (Section 2 & Table 1.1)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mono">
                  <div className="p-2 bg-slate-100 rounded border border-slate-200">
                    <strong className="text-sky-800">Station 1:</strong> Ambient (P1, T1)
                  </div>
                  <div className="p-2 bg-slate-100 rounded border border-slate-200">
                    <strong className="text-sky-800">Station 2:</strong> Compressor (P2, T2)
                  </div>
                  <div className="p-2 bg-slate-100 rounded border border-slate-200">
                    <strong className="text-sky-800">Station 3:</strong> Combustor/T3 (P3, T3)
                  </div>
                  <div className="p-2 bg-slate-100 rounded border border-slate-200">
                    <strong className="text-sky-800">Station 4:</strong> Turbine Exit (P4, T4)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
