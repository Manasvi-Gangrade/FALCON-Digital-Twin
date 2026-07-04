import { useState, useEffect, useMemo, useRef } from "react";
import { Database, UploadCloud, FileSpreadsheet, LineChart as ChartIcon, CheckCircle2, Loader2, AlertCircle, Cpu, Layers, Activity } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { cn } from "@/lib/utils";

interface DataRow {
  index: number; // Cycle
  altitude: number; // m
  mach: number;
  tamb: number; // K
  pamb: number; // kPa
  rpm: number; // rpm
  fuelFlow: number; // kg/h
  p2: number; // kPa
  t2: number; // K
  p3: number; // kPa
  t3: number; // K
  p4: number; // kPa
  t4: number; // K
  compressorHealth: number; // %
  combustorHealth: number; // %
  turbineHealth: number; // %
  healthIndex: number; // %
  thrust: number; // N
  tsfc: number; // g/N-s
}

// Simple robust CSV parser
function parseCSV(text: string): Record<string, number>[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const row: Record<string, number> = {};
    headers.forEach((header, index) => {
      row[header] = parseFloat(values[index]) || 0;
    });
    return row;
  });
}

export function DatasetExplorer() {
  const [datasetSource, setDatasetSource] = useState<"train" | "test" | "complete">("train");
  const [selectedEngineId, setSelectedEngineId] = useState<number>(1);
  const [yKey1, setYKey1] = useState<keyof DataRow>("t3");
  const [yKey2, setYKey2] = useState<keyof DataRow>("healthIndex");
  
  const [trainData, setTrainData] = useState<Record<string, number>[]>([]);
  const [testData, setTestData] = useState<Record<string, number>[]>([]);
  const [groundTruthData, setGroundTruthData] = useState<Record<string, number>[]>([]);
  const [completeData, setCompleteData] = useState<Record<string, number>[]>([]);
  
  const [customData, setCustomData] = useState<DataRow[] | null>(null);
  const [customFileName, setCustomFileName] = useState<string>("");
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load datasets dynamically on mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/Datasets/train.csv").then(r => {
        if (!r.ok) throw new Error("Could not load train.csv");
        return r.text();
      }).then(parseCSV),
      fetch("/Datasets/test.csv").then(r => {
        if (!r.ok) throw new Error("Could not load test.csv");
        return r.text();
      }).then(parseCSV),
      fetch("/Datasets/ground_truth.csv").then(r => {
        if (!r.ok) throw new Error("Could not load ground_truth.csv");
        return r.text();
      }).then(parseCSV),
      fetch("/Datasets/turbojet_complete_dataset.csv").then(r => {
        if (!r.ok) throw new Error("Could not load turbojet_complete_dataset.csv");
        return r.text();
      }).then(parseCSV)
    ])
      .then(([train, test, gt, complete]) => {
        setTrainData(train);
        setTestData(test);
        setGroundTruthData(gt);
        setCompleteData(complete);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load telemetry CSVs:", err);
        setError("Error fetching datasets. Please verify public/Datasets files exist and vercel routing is correct.");
        setLoading(false);
      });
  }, []);

  // Map and join selected dataset
  const activeData = useMemo(() => {
    if (customData) return customData;

    const source = datasetSource === "train" 
      ? trainData 
      : datasetSource === "test" 
        ? testData 
        : completeData;
    const filtered = source.filter(row => row.EngineID === selectedEngineId);
    
    return filtered.map(row => {
      const hasDirectHealth = row.OverallHealth !== undefined;
      
      const compH = hasDirectHealth ? Math.round(row.CompressorHealth * 1000) / 10 : 100;
      const combH = hasDirectHealth ? Math.round(row.CombustorHealth * 1000) / 10 : 100;
      const turbH = hasDirectHealth ? Math.round(row.TurbineHealth * 1000) / 10 : 100;
      const overallH = hasDirectHealth ? Math.round(row.OverallHealth * 1000) / 10 : 100;
      const thrust = hasDirectHealth ? Math.round(row.Thrust_N) : 0;
      const tsfc = hasDirectHealth ? Math.round(row.TSFC_g_N_s * 100000) / 100000 : 0;

      const gtRow = !hasDirectHealth 
        ? groundTruthData.find(gt => gt.EngineID === row.EngineID && gt.Cycle === row.Cycle) 
        : null;
      
      const compH_val = hasDirectHealth ? compH : (gtRow ? Math.round(gtRow.CompressorHealth * 1000) / 10 : 100);
      const combH_val = hasDirectHealth ? combH : (gtRow ? Math.round(gtRow.CombustorHealth * 1000) / 10 : 100);
      const turbH_val = hasDirectHealth ? turbH : (gtRow ? Math.round(gtRow.TurbineHealth * 1000) / 10 : 100);
      const overallH_val = hasDirectHealth ? overallH : (gtRow ? Math.round(gtRow.OverallHealth * 1000) / 10 : 100);
      const thrust_val = hasDirectHealth ? thrust : (gtRow ? Math.round(gtRow.Thrust_N) : 0);
      const tsfc_val = hasDirectHealth ? tsfc : (gtRow ? Math.round(gtRow.TSFC_g_N_s * 100000) / 100000 : 0);

      return {
        index: row.Cycle || 0,
        altitude: Math.round(row.Altitude_m || 0),
        mach: Math.round((row.Mach || 0) * 1000) / 1000,
        tamb: Math.round(row.Tamb_K || 0),
        pamb: Math.round((row.Pamb_Pa || 0) / 100) / 10, // Pa to kPa
        rpm: Math.round(row.RPM_rev_min || 0),
        fuelFlow: Math.round((row.FuelFlow_kg_s || 0) * 3600 * 10) / 10, // kg/s to kg/h
        p2: Math.round((row.P2_Pa || 0) / 100) / 10, // Pa to kPa
        t2: Math.round(row.T2_K || 0),
        p3: Math.round((row.P3_Pa || 0) / 100) / 10, // Pa to kPa
        t3: Math.round(row.T3_K || 0),
        p4: Math.round((row.P4_Pa || 0) / 100) / 10, // Pa to kPa
        t4: Math.round(row.T4_K || 0),
        compressorHealth: compH_val,
        combustorHealth: combH_val,
        turbineHealth: turbH_val,
        healthIndex: overallH_val,
        thrust: thrust_val,
        tsfc: tsfc_val
      };
    }).sort((a, b) => a.index - b.index);
  }, [datasetSource, selectedEngineId, trainData, testData, groundTruthData, completeData, customData]);

  // Handle local file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        
        if (parsed.length === 0) {
          throw new Error("No data found in uploaded CSV file.");
        }

        // Map custom rows to match DataRow schema
        const mapped = parsed.map((row, index) => ({
          index: row.Cycle || row.index || index + 1,
          altitude: Math.round(row.Altitude_m || row.altitude || 0),
          mach: Math.round((row.Mach || row.mach || 0) * 1000) / 1000,
          tamb: Math.round(row.Tamb_K || row.tamb || 0),
          pamb: Math.round((row.Pamb_Pa || row.pamb || 0) / 100) / 10,
          rpm: Math.round(row.RPM_rev_min || row.rpm || 0),
          fuelFlow: Math.round((row.FuelFlow_kg_s || row.fuelFlow || 0) * 3600 * 10) / 10,
          p2: Math.round((row.P2_Pa || row.p2 || 0) / 100) / 10,
          t2: Math.round(row.T2_K || row.t2 || 0),
          p3: Math.round((row.P3_Pa || row.p3 || 0) / 100) / 10,
          t3: Math.round(row.T3_K || row.t3 || 0),
          p4: Math.round((row.P4_Pa || row.p4 || 0) / 100) / 10,
          t4: Math.round(row.T4_K || row.t4 || 0),
          compressorHealth: Math.round((row.CompressorHealth || row.compressorHealth || 0.98) * 100),
          combustorHealth: Math.round((row.CombustorHealth || row.combustorHealth || 0.99) * 100),
          turbineHealth: Math.round((row.TurbineHealth || row.turbineHealth || 0.97) * 100),
          healthIndex: Math.round((row.OverallHealth || row.healthIndex || 0.98) * 100),
          thrust: Math.round(row.Thrust_N || row.thrust || 0),
          tsfc: Math.round((row.TSFC_g_N_s || row.tsfc || 0) * 100000) / 100000
        }));

        setCustomData(mapped);
        setUploadText(`CSV parsed: ${file.name} ingested successfully. Ingested ${mapped.length} telemetry records.`);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 4500);
      } catch (err) {
        console.error(err);
        alert("Failed to parse CSV. Please verify it contains headers like EngineID, Cycle, Altitude_m, Mach, Tamb_K, etc.");
      }
    };
    reader.readAsText(file);
  };

  const handleSimulateUpload = () => {
    fileInputRef.current?.click();
  };

  const clearCustomDataset = () => {
    setCustomData(null);
    setCustomFileName("");
  };

  // Find unique engines present in the loaded dataset
  const availableEngineIds = useMemo(() => {
    const source = datasetSource === "train" 
      ? trainData 
      : datasetSource === "test" 
        ? testData 
        : completeData;
    const ids = Array.from(new Set(source.map(row => row.EngineID))).filter(id => id > 0);
    return ids.sort((a, b) => a - b);
  }, [datasetSource, trainData, testData, completeData]);

  // Aggregate statistics for overview panel
  const stats = useMemo(() => {
    if (activeData.length === 0) return { count: 0, avgHealth: 0, maxCycle: 0, avgRPM: 0 };
    const totalHealth = activeData.reduce((acc, row) => acc + row.healthIndex, 0);
    const totalRPM = activeData.reduce((acc, row) => acc + row.rpm, 0);
    const maxCycle = Math.max(...activeData.map(row => row.index));
    return {
      count: activeData.length,
      avgHealth: Math.round(totalHealth / activeData.length * 10) / 10,
      maxCycle,
      avgRPM: Math.round(totalRPM / activeData.length)
    };
  }, [activeData]);

  const keyLabel = (k: keyof DataRow) => {
    switch (k) {
      case "altitude": return "Altitude (m)";
      case "mach": return "Mach Number";
      case "tamb": return "Tamb (K)";
      case "pamb": return "Pamb (kPa)";
      case "rpm": return "RPM (rev/min)";
      case "fuelFlow": return "Fuel Flow (kg/h)";
      case "p2": return "Inlet Press P2 (kPa)";
      case "t2": return "Inlet Temp T2 (K)";
      case "p3": return "Combustor Press P3 (kPa)";
      case "t3": return "Turbine Inlet Temp T3 (K)";
      case "p4": return "Turbine Press P4 (kPa)";
      case "t4": return "Turbine Exit Temp T4 (K)";
      case "compressorHealth": return "Compressor Health (%)";
      case "combustorHealth": return "Combustor Health (%)";
      case "turbineHealth": return "Turbine Health (%)";
      case "healthIndex": return "Overall Health (%)";
      case "thrust": return "Thrust Force (N)";
      case "tsfc": return "TSFC (g/N-s)";
      default: return String(k);
    }
  };

  const keyColor = (k: keyof DataRow, isPrimary: boolean) => {
    if (isPrimary) {
      return k === "healthIndex" || k === "compressorHealth" || k === "turbineHealth" 
        ? "var(--hud-green)" 
        : "var(--hud-cyan)";
    }
    return "var(--hud-violet)";
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".csv" 
        className="hidden" 
      />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-hud-cyan glow-cyan" />
            <span className="eyebrow text-slate-100">HAL Flight Log Database</span>
          </div>
          <h1 className="mono mt-2 text-3xl font-bold tracking-tight text-white">
            Dataset <span className="text-hud-cyan">Explorer</span>
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Ingest, parse, and analyze real multi-variable digital twin dataset logs for four-stage turbojets.
          </p>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="panel p-12 text-center flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 text-hud-cyan animate-spin" />
          <span className="mono text-xs text-slate-500">Fetching HAL flight logs and ground truth tables...</span>
        </div>
      )}

      {error && (
        <div className="panel p-6 border-hud-red bg-hud-red/10 text-hud-red text-center space-y-3 flex flex-col items-center">
          <AlertCircle className="h-10 w-10 shrink-0" />
          <div className="mono text-xs font-bold">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="rounded border border-hud-red/40 px-3 py-1 text-[10px] uppercase font-bold mono bg-white/20 hover:bg-white/40"
          >
            Retry Fetch
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Real-time stats display bar */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="panel panel-accent-cyan p-4 shadow-sm flex items-center gap-3">
              <Layers className="h-7 w-7 text-hud-cyan" />
              <div>
                <div className="text-[10px] text-hud-muted uppercase tracking-wider mono">Records Ingested</div>
                <div className="text-lg font-bold text-slate-900 mono">{stats.count} cycles</div>
              </div>
            </div>
            <div className="panel panel-accent-green p-4 shadow-sm flex items-center gap-3">
              <Cpu className="h-7 w-7 text-hud-green" />
              <div>
                <div className="text-[10px] text-hud-muted uppercase tracking-wider mono">Average Health</div>
                <div className="text-lg font-bold text-slate-900 mono">{stats.avgHealth}%</div>
              </div>
            </div>
            <div className="panel panel-accent-violet p-4 shadow-sm flex items-center gap-3">
              <Activity className="h-7 w-7 text-hud-violet" />
              <div>
                <div className="text-[10px] text-hud-muted uppercase tracking-wider mono">Average RPM</div>
                <div className="text-lg font-bold text-slate-900 mono">{stats.avgRPM} rev/m</div>
              </div>
            </div>
            <div className="panel panel-accent-amber p-4 shadow-sm flex items-center gap-3">
              <FileSpreadsheet className="h-7 w-7 text-hud-amber" />
              <div>
                <div className="text-[10px] text-hud-muted uppercase tracking-wider mono">Max Engine Cycle</div>
                <div className="text-lg font-bold text-slate-900 mono">Cycle #{stats.maxCycle}</div>
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            {/* Left Control Column */}
            <div className="space-y-4 lg:col-span-1">
              
              {/* Custom uploaded file controls */}
              {customFileName && (
                <div className="panel p-3.5 border-hud-teal bg-hud-teal/5 flex flex-col gap-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="mono text-[10px] font-bold text-hud-teal uppercase">Custom Dataset Active</span>
                    <button 
                      onClick={clearCustomDataset}
                      className="text-[9px] font-bold text-hud-red hover:underline uppercase mono"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 font-medium truncate">{customFileName}</div>
                </div>
              )}

              {/* File selector panel */}
              <div className={cn(
                "panel panel-accent-cyan p-4 shadow-md",
                customFileName && "opacity-50 pointer-events-none"
              )}>
                <div className="eyebrow mb-3 text-slate-500">Select Dataset Log Source</div>
                <div className="grid grid-cols-3 gap-1.5 mb-4">
                  <button
                    onClick={() => {
                      setDatasetSource("train");
                      setSelectedEngineId(1);
                    }}
                    className={cn(
                      "rounded border py-1.5 text-center text-[10px] font-bold uppercase mono transition-all",
                      datasetSource === "train"
                        ? "border-hud-cyan bg-hud-cyan/10 text-hud-cyan"
                        : "border-hud-border hover:bg-[color:var(--hud-panel-2)] text-slate-700"
                    )}
                  >
                    Train Set
                  </button>
                  <button
                    onClick={() => {
                      setDatasetSource("test");
                      setSelectedEngineId(6);
                    }}
                    className={cn(
                      "rounded border py-1.5 text-center text-[10px] font-bold uppercase mono transition-all",
                      datasetSource === "test"
                        ? "border-hud-cyan bg-hud-cyan/10 text-hud-cyan"
                        : "border-hud-border hover:bg-[color:var(--hud-panel-2)] text-slate-700"
                    )}
                  >
                    Test Set
                  </button>
                  <button
                    onClick={() => {
                      setDatasetSource("complete");
                      setSelectedEngineId(1);
                    }}
                    className={cn(
                      "rounded border py-1.5 text-center text-[10px] font-bold uppercase mono transition-all",
                      datasetSource === "complete"
                        ? "border-hud-cyan bg-hud-cyan/10 text-hud-cyan"
                        : "border-hud-border hover:bg-[color:var(--hud-panel-2)] text-slate-700"
                    )}
                  >
                    Complete
                  </button>
                </div>

                <div className="eyebrow mb-2 text-slate-500">Target Engine ID</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {availableEngineIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => setSelectedEngineId(id)}
                      className={cn(
                        "rounded border py-1 text-center text-xs font-semibold mono transition-all",
                        selectedEngineId === id
                          ? "border-hud-cyan bg-hud-cyan/10 text-hud-cyan font-bold"
                          : "border-hud-border hover:bg-[color:var(--hud-panel-2)] text-slate-700"
                      )}
                    >
                      #{id}
                    </button>
                  ))}
                </div>
                <div className="text-[9px] text-hud-muted mt-2 mono">
                  *Engine data records filtered from real {datasetSource === "complete" ? "turbojet_complete_dataset" : datasetSource}.csv files
                </div>
              </div>

              {/* Chart config panel */}
              <div className="panel panel-accent-violet p-4 shadow-md">
                <div className="eyebrow mb-3 text-slate-500">Visualization Config</div>
                <div className="space-y-3">
                  <div>
                    <label className="mono text-[10px] text-hud-muted block mb-1">Y1 Primary Axis</label>
                    <select
                      value={yKey1}
                      onChange={(e) => setYKey1(e.target.value as keyof DataRow)}
                      className="w-full rounded border border-hud-border bg-[color:var(--hud-panel-2)] px-2 py-1 text-xs mono text-slate-700"
                    >
                      <option value="altitude">Altitude (m)</option>
                      <option value="mach">Mach Number</option>
                      <option value="rpm">RPM (rev/min)</option>
                      <option value="fuelFlow">Fuel Flow (kg/h)</option>
                      <option value="t3">Turbine Temp T3 (K)</option>
                      <option value="p3">Combustor Press P3 (kPa)</option>
                      <option value="t4">Turbine Exit Temp T4 (K)</option>
                      <option value="compressorHealth">Compressor Health (%)</option>
                      <option value="turbineHealth">Turbine Health (%)</option>
                      <option value="healthIndex">Overall Health Index (%)</option>
                      <option value="thrust">Thrust (N)</option>
                      <option value="tsfc">TSFC (g/N-s)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mono text-[10px] text-hud-muted block mb-1">Y2 Secondary Axis</label>
                    <select
                      value={yKey2}
                      onChange={(e) => setYKey2(e.target.value as keyof DataRow)}
                      className="w-full rounded border border-hud-border bg-[color:var(--hud-panel-2)] px-2 py-1 text-xs mono text-slate-700"
                    >
                      <option value="altitude">Altitude (m)</option>
                      <option value="mach">Mach Number</option>
                      <option value="rpm">RPM (rev/min)</option>
                      <option value="fuelFlow">Fuel Flow (kg/h)</option>
                      <option value="t3">Turbine Temp T3 (K)</option>
                      <option value="p3">Combustor Press P3 (kPa)</option>
                      <option value="t4">Turbine Exit Temp T4 (K)</option>
                      <option value="compressorHealth">Compressor Health (%)</option>
                      <option value="turbineHealth">Turbine Health (%)</option>
                      <option value="healthIndex">Overall Health Index (%)</option>
                      <option value="thrust">Thrust (N)</option>
                      <option value="tsfc">TSFC (g/N-s)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Upload Zone */}
              <div
                onClick={handleSimulateUpload}
                className="panel panel-accent-teal border-dashed p-4 text-center cursor-pointer hover:bg-[color:var(--hud-panel-2)] transition-all shadow-md flex flex-col items-center justify-center min-h-[140px]"
              >
                <UploadCloud className="h-8 w-8 text-hud-teal mb-2" />
                <div className="mono text-xs font-bold text-slate-700">Upload Flight Dataset</div>
                <div className="mono text-[9px] text-slate-400 mt-1">
                  Click to choose a custom CSV telemetry file. Visualizes on-the-fly dynamically.
                </div>
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
              <div className="panel panel-accent-cyan p-4 shadow-md">
                <div className="flex items-center justify-between border-b border-hud-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <ChartIcon className="h-4 w-4 text-hud-cyan" />
                    <div className="eyebrow text-slate-500">Multi-Variable Parameter Mapping</div>
                  </div>
                  <div className="mono text-[10px] text-hud-muted">
                    {customFileName ? `Custom Log: ${customFileName}` : `${datasetSource.toUpperCase()} LOG - ENGINE ID #${selectedEngineId}`}
                  </div>
                </div>

                <div className="mt-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(15,23,42,0.04)" strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="index" 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        tickLine={false} 
                        label={{ value: 'Cycle Records', position: 'insideBottomRight', offset: -5, fill: "#94a3b8", fontSize: 9 }} 
                      />
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
                        dot={{ r: 2 }}
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
                        dot={{ r: 1.5 }}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabular data explorer */}
              <div className="panel panel-accent-violet p-4 shadow-md overflow-hidden">
                <div className="flex items-center gap-2 border-b border-hud-border pb-2.5 mb-3">
                  <FileSpreadsheet className="h-4 w-4 text-hud-violet" />
                  <div className="eyebrow text-slate-500">Tabular Dataset Records</div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs mono">
                    <thead>
                      <tr className="border-b border-hud-border text-hud-muted bg-[color:var(--hud-panel-2)] text-[10px] uppercase">
                        <th className="py-2 px-3 font-semibold">Cycle</th>
                        <th className="py-2 px-2 font-semibold">Alt (m)</th>
                        <th className="py-2 px-2 font-semibold">Mach</th>
                        <th className="py-2 px-2 font-semibold">Tamb (K)</th>
                        <th className="py-2 px-2 font-semibold">RPM</th>
                        <th className="py-2 px-2 font-semibold">Fuel (kg/h)</th>
                        <th className="py-2 px-2 font-semibold">T3 (K)</th>
                        <th className="py-2 px-2 font-semibold">T4 (K)</th>
                        <th className="py-2 px-2 font-semibold">CompH (%)</th>
                        <th className="py-2 px-2 font-semibold">TurbH (%)</th>
                        <th className="py-2 px-2 font-semibold">Overall (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hud-border text-slate-700">
                      {activeData.slice(0, 10).map((row) => (
                        <tr key={row.index} className="hover:bg-[color:var(--hud-panel-2)]/50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">#{row.index}</td>
                          <td className="py-2.5 px-2">{row.altitude}</td>
                          <td className="py-2.5 px-2 font-semibold text-hud-cyan">{row.mach.toFixed(3)}</td>
                          <td className="py-2.5 px-2">{row.tamb} K</td>
                          <td className="py-2.5 px-2">{row.rpm}</td>
                          <td className="py-2.5 px-2">{row.fuelFlow}</td>
                          <td className="py-2.5 px-2 text-hud-amber font-semibold">{row.t3}</td>
                          <td className="py-2.5 px-2">{row.t4}</td>
                          <td className="py-2.5 px-2 text-hud-teal font-semibold">{row.compressorHealth}%</td>
                          <td className="py-2.5 px-2 text-hud-violet font-semibold">{row.turbineHealth}%</td>
                          <td className="py-2.5 px-2">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-bold",
                              row.healthIndex >= 85
                                ? "bg-hud-green/10 text-hud-green border border-hud-green/20"
                                : row.healthIndex >= 65
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
                  <div className="text-[10px] text-hud-muted mt-2.5 text-right italic">
                    Showing top 10 cycles of {activeData.length} records. Custom CSV uploads automatically update this workspace.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
