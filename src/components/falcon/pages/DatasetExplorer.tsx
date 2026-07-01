import { useState, useMemo } from "react";
import { Database, UploadCloud, FileSpreadsheet, LineChart as ChartIcon, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { cn } from "@/lib/utils";

interface DataRow {
  index: number;
  altitude: number; // m
  mach: number;
  tamb: number; // K
  pamb: number; // kPa
  rpm: number; // %
  fuelFlow: number; // kg/h
  t3: number; // K
  p3: number; // kPa
  t4: number; // K
  healthIndex: number; // %
}

// Generate high-fidelity mock datasets for demonstration
const generateNominalLog = (): DataRow[] => {
  return Array.from({ length: 30 }).map((_, i) => {
    const altitude = 1000 + i * 240;
    const mach = 0.3 + (i * 0.015);
    const tamb = Math.round(288.15 - 0.0065 * altitude);
    const pamb = Math.round(101.3 * Math.pow(1 - 0.0000225 * altitude, 5.25));
    const rpm = Math.round(82 + Math.sin(i / 5) * 5 + (i * 0.4));
    const fuelFlow = Math.round(1800 + (rpm * 15) + (altitude * 0.08));
    const t3 = Math.round(980 + (rpm * 2.5) + (mach * 120));
    const p3 = Math.round(pamb * (3.2 + (rpm / 100) * 1.5));
    const t4 = Math.round(t3 * 0.81);
    const healthIndex = Math.round(98.5 - (i * 0.05));
    return { index: i + 1, altitude, mach, tamb, pamb, rpm, fuelFlow, t3, p3, t4, healthIndex };
  });
};

const generateHighMachLog = (): DataRow[] => {
  return Array.from({ length: 30 }).map((_, i) => {
    const altitude = 5000 + Math.sin(i / 4) * 500;
    const mach = i < 15 ? 0.6 + i * 0.03 : 1.05 - (i - 15) * 0.015; // supersonic barrier breach
    const tamb = Math.round(288.15 - 0.0065 * altitude);
    const pamb = Math.round(101.3 * Math.pow(1 - 0.0000225 * altitude, 5.25));
    const rpm = Math.round(95 + (mach * 4));
    const fuelFlow = Math.round(2500 + (mach * 1200) + (rpm * 10));
    const t3 = Math.round(1120 + (mach * 240));
    const p3 = Math.round(pamb * (4.1 + (mach * 1.1)));
    const t4 = Math.round(t3 * 0.83);
    const healthIndex = Math.round(96.8 - (i * 0.08));
    return { index: i + 1, altitude, mach, tamb, pamb, rpm, fuelFlow, t3, p3, t4, healthIndex };
  });
};

const generateDegradedLog = (): DataRow[] => {
  return Array.from({ length: 30 }).map((_, i) => {
    const altitude = 6000;
    const mach = 0.62;
    const tamb = Math.round(288.15 - 0.0065 * altitude);
    const pamb = Math.round(101.3 * Math.pow(1 - 0.0000225 * altitude, 5.25));
    const rpm = Math.round(86 + Math.sin(i / 2) * 1.5);
    // Abnormally high fuel flow & turbine exit temperature (T4) due to turbine degradation
    const fuelFlow = Math.round(2400 + (i * 35) + Math.random() * 30);
    const t3 = Math.round(1180 + (i * 6));
    const p3 = Math.round(pamb * (3.6 - (i * 0.015)));
    const t4 = Math.round(t3 * (0.83 + (i * 0.002))); // exhaust temperature climbing
    const healthIndex = Math.max(20, Math.round(84.2 - (i * 1.8))); // steep degradation
    return { index: i + 1, altitude, mach, tamb, pamb, rpm, fuelFlow, t3, p3, t4, healthIndex };
  });
};

export function DatasetExplorer() {
  const [selectedLog, setSelectedLog] = useState<"nominal" | "highMach" | "degraded">("nominal");
  const [yKey1, setYKey1] = useState<keyof DataRow>("t3");
  const [yKey2, setYKey2] = useState<keyof DataRow>("fuelFlow");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadText, setUploadText] = useState("");

  const activeData = useMemo(() => {
    switch (selectedLog) {
      case "highMach":
        return generateHighMachLog();
      case "degraded":
        return generateDegradedLog();
      default:
        return generateNominalLog();
    }
  }, [selectedLog]);

  const handleSimulateUpload = () => {
    setUploadSuccess(true);
    setUploadText("Dataset parsed: HAL-Test-Standard-30.csv loaded. Ingested 30 cycle records, sync active.");
    setTimeout(() => {
      setUploadSuccess(false);
    }, 4500);
  };

  const keyLabel = (k: keyof DataRow) => {
    switch (k) {
      case "altitude": return "Altitude (m)";
      case "mach": return "Mach Number";
      case "tamb": return "Tamb (K)";
      case "pamb": return "Pamb (kPa)";
      case "rpm": return "RPM (%)";
      case "fuelFlow": return "Fuel Flow (kg/h)";
      case "t3": return "Turbine Inlet Temp T3 (K)";
      case "p3": return "Combustor Press P3 (kPa)";
      case "t4": return "Turbine Exit Temp T4 (K)";
      case "healthIndex": return "Engine Health Index (%)";
      default: return String(k);
    }
  };

  const keyColor = (k: keyof DataRow, isPrimary: boolean) => {
    if (isPrimary) {
      return k === "healthIndex" ? "var(--hud-green)" : "var(--hud-cyan)";
    }
    return "var(--hud-violet)";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-hud-cyan" />
            <span className="eyebrow text-slate-100">HAL Flight Log Database</span>
          </div>
          <h1 className="mono mt-2 text-3xl font-bold tracking-tight text-white">
            Dataset <span className="text-hud-cyan">Explorer</span>
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Ingest and analyze multi-variable digital twin dataset logs for four-stage turbojets.
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Control Column */}
        <div className="space-y-4 lg:col-span-1">
          {/* File selector panel */}
          <div className="panel panel-accent-cyan p-4 shadow-md bg-white">
            <div className="eyebrow mb-3 text-slate-500">Select Active Dataset Log</div>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedLog("nominal")}
                className={cn(
                  "w-full rounded border px-3 py-2 text-left text-xs font-semibold mono transition-all",
                  selectedLog === "nominal"
                    ? "border-hud-green bg-hud-green/10 text-hud-green"
                    : "border-hud-border hover:bg-slate-50 text-slate-700"
                )}
              >
                ✈ HAL-LOG-001 (Nominal Climb)
              </button>
              <button
                onClick={() => setSelectedLog("highMach")}
                className={cn(
                  "w-full rounded border px-3 py-2 text-left text-xs font-semibold mono transition-all",
                  selectedLog === "highMach"
                    ? "border-hud-cyan bg-hud-cyan/10 text-hud-cyan"
                    : "border-hud-border hover:bg-slate-50 text-slate-700"
                )}
              >
                ⚡ HAL-LOG-002 (High Mach Run)
              </button>
              <button
                onClick={() => setSelectedLog("degraded")}
                className={cn(
                  "w-full rounded border px-3 py-2 text-left text-xs font-semibold mono transition-all",
                  selectedLog === "degraded"
                    ? "border-hud-red bg-hud-red/10 text-hud-red"
                    : "border-hud-border hover:bg-slate-50 text-slate-700"
                )}
              >
                ⚠️ HAL-LOG-003 (Turbine Erosion)
              </button>
            </div>
          </div>

          {/* Chart config panel */}
          <div className="panel panel-accent-violet p-4 shadow-md bg-white">
            <div className="eyebrow mb-3 text-slate-500">Visualization Config</div>
            <div className="space-y-3">
              <div>
                <label className="mono text-[10px] text-hud-muted block mb-1">Y1 Primary Axis</label>
                <select
                  value={yKey1}
                  onChange={(e) => setYKey1(e.target.value as keyof DataRow)}
                  className="w-full rounded border border-hud-border bg-white px-2 py-1 text-xs mono text-slate-700"
                >
                  <option value="altitude">Altitude (m)</option>
                  <option value="mach">Mach Number</option>
                  <option value="rpm">RPM (%)</option>
                  <option value="fuelFlow">Fuel Flow (kg/h)</option>
                  <option value="t3">Turbine Temp T3 (K)</option>
                  <option value="p3">Combustor Press P3 (kPa)</option>
                  <option value="t4">Turbine Temp T4 (K)</option>
                  <option value="healthIndex">Health Index (%)</option>
                </select>
              </div>

              <div>
                <label className="mono text-[10px] text-hud-muted block mb-1">Y2 Secondary Axis</label>
                <select
                  value={yKey2}
                  onChange={(e) => setYKey2(e.target.value as keyof DataRow)}
                  className="w-full rounded border border-hud-border bg-white px-2 py-1 text-xs mono text-slate-700"
                >
                  <option value="altitude">Altitude (m)</option>
                  <option value="mach">Mach Number</option>
                  <option value="rpm">RPM (%)</option>
                  <option value="fuelFlow">Fuel Flow (kg/h)</option>
                  <option value="t3">Turbine Temp T3 (K)</option>
                  <option value="p3">Combustor Press P3 (kPa)</option>
                  <option value="t4">Turbine Temp T4 (K)</option>
                  <option value="healthIndex">Health Index (%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vercel / Drag upload zone */}
          <div
            onClick={handleSimulateUpload}
            className="panel panel-accent-teal border-dashed p-4 text-center cursor-pointer hover:bg-slate-50 transition-all bg-white shadow-md flex flex-col items-center justify-center min-h-[140px]"
          >
            <UploadCloud className="h-8 w-8 text-hud-teal mb-2" />
            <div className="mono text-xs font-bold text-slate-700">Upload Flight Dataset</div>
            <div className="mono text-[9px] text-slate-400 mt-1">Drag .csv or .json files here to simulate Vercel real-time stream ingestion.</div>
          </div>
        </div>

        {/* Right Columns (Chart & Table) */}
        <div className="space-y-6 lg:col-span-3">
          {/* Success Banner */}
          {uploadSuccess && (
            <div className="rounded-md border border-hud-green bg-hud-green/10 p-3.5 flex items-center gap-3 text-hud-green text-xs font-semibold mono anim-fade-up">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{uploadText}</span>
            </div>
          )}

          {/* Time Series chart */}
          <div className="panel panel-accent-cyan p-4 shadow-md bg-white">
            <div className="flex items-center justify-between border-b border-hud-border pb-2.5">
              <div className="flex items-center gap-2">
                <ChartIcon className="h-4 w-4 text-hud-cyan" />
                <div className="eyebrow text-slate-500">Multi-Variable Parameter Mapping</div>
              </div>
              <div className="mono text-[10px] text-hud-muted">
                {selectedLog === "nominal" ? "Nominal Cruise Flight Phase" : selectedLog === "highMach" ? "Supersonic Maneuvering Phase" : "Degraded Performance Phase"}
              </div>
            </div>

            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(15,23,42,0.04)" strokeDasharray="3 3" />
                  <XAxis dataKey="index" stroke="#94a3b8" fontSize={10} tickLine={false} label={{ value: 'Cycle Records', position: 'insideBottomRight', offset: -5, fill: "#94a3b8", fontSize: 9 }} />
                  <YAxis yAxisId="left" stroke={keyColor(yKey1, true)} fontSize={10} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke={keyColor(yKey2, false)} fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)", borderRadius: "6px" }}
                    labelFormatter={(label) => `Cycle Record #${label}`}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey={yKey1}
                    name={keyLabel(yKey1)}
                    stroke={keyColor(yKey1, true)}
                    strokeWidth={2.4}
                    dot={false}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={yKey2}
                    name={keyLabel(yKey2)}
                    stroke={keyColor(yKey2, false)}
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabular data explorer */}
          <div className="panel panel-accent-violet p-4 shadow-md bg-white overflow-hidden">
            <div className="flex items-center gap-2 border-b border-hud-border pb-2.5 mb-3">
              <FileSpreadsheet className="h-4 w-4 text-hud-violet" />
              <div className="eyebrow text-slate-500">Tabular Dataset Records</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs mono">
                <thead>
                  <tr className="border-b border-hud-border text-hud-muted bg-slate-50 text-[10px] uppercase">
                    <th className="py-2 px-3 font-semibold">Record</th>
                    <th className="py-2 px-2 font-semibold">Alt (m)</th>
                    <th className="py-2 px-2 font-semibold">Mach</th>
                    <th className="py-2 px-2 font-semibold">Tamb (K)</th>
                    <th className="py-2 px-2 font-semibold">Pamb (kPa)</th>
                    <th className="py-2 px-2 font-semibold">RPM (%)</th>
                    <th className="py-2 px-2 font-semibold">Fuel (kg/h)</th>
                    <th className="py-2 px-2 font-semibold">T3 (K)</th>
                    <th className="py-2 px-2 font-semibold">P3 (kPa)</th>
                    <th className="py-2 px-2 font-semibold">T4 (K)</th>
                    <th className="py-2 px-2 font-semibold">Health (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hud-border text-slate-700">
                  {activeData.slice(0, 7).map((row) => (
                    <tr key={row.index} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">#{row.index}</td>
                      <td className="py-2.5 px-2">{row.altitude}</td>
                      <td className="py-2.5 px-2 font-semibold text-hud-cyan">{row.mach.toFixed(3)}</td>
                      <td className="py-2.5 px-2">{row.tamb} K</td>
                      <td className="py-2.5 px-2">{row.pamb}</td>
                      <td className="py-2.5 px-2">{row.rpm}%</td>
                      <td className="py-2.5 px-2">{row.fuelFlow}</td>
                      <td className="py-2.5 px-2 text-hud-amber font-semibold">{row.t3}</td>
                      <td className="py-2.5 px-2">{row.p3}</td>
                      <td className="py-2.5 px-2">{row.t4}</td>
                      <td className="py-2.5 px-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-bold",
                          row.healthIndex >= 95
                            ? "bg-hud-green/10 text-hud-green border border-hud-green/20"
                            : row.healthIndex >= 70
                            ? "bg-hud-cyan/10 text-hud-cyan border border-hud-cyan/20"
                            : "bg-hud-red/10 text-hud-red border border-hud-red/20"
                        )}>
                          {row.healthIndex}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[10px] text-hud-muted mt-2 text-right italic">
                Showing top 7 of 30 flight log entries. Use file uploads to feed infinite custom series streams.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
