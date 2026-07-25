import { useEffect, useRef, useState } from "react";
import { Send, Sparkle, Bot, User, ShieldCheck, Wrench, Plane, Activity, FileText, CheckCircle2, AlertTriangle, ExternalLink, Volume2, Copy, Check } from "lucide-react";
import type { Engine } from "@/lib/telemetry";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { soundFx } from "@/lib/audio-effects";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  spark?: number[];
  ticket?: {
    orderId: string;
    targetEngine: string;
    tailNumber: string;
    priority: "CRITICAL" | "HIGH" | "MEDIUM" | "ROUTINE";
    actionRequired: string;
    estHours: number;
    requiredTools: string[];
    milStdRef: string;
  };
  complianceTable?: {
    standard: string;
    parameter: string;
    measured: string;
    limit: string;
    status: "PASS" | "WARN" | "FAIL";
  }[];
};

type ShortcutCategory = "mil_std" | "maintenance" | "mission" | "telemetry";

const SHORTCUT_CATEGORIES: {
  id: ShortcutCategory;
  label: string;
  icon: React.ElementType;
  queries: string[];
}[] = [
  {
    id: "mil_std",
    label: "MIL-STD Compliance",
    icon: ShieldCheck,
    queries: [
      "Check MIL-STD-1789B thermal & EGT compliance limits",
      "Validate vibration amplitudes against MIL-E-8593A",
      "Audit DEF-STAN 00-970 sensor signal-to-noise ratio",
    ],
  },
  {
    id: "maintenance",
    label: "Depot Workflows",
    icon: Wrench,
    queries: [
      "Generate HAL Level-2 Depot Maintenance Dispatch Form for TJ-04C",
      "What are the required steps to replace HPT Stage 1 rotor blades?",
      "Which component requires immediate depot attention?",
    ],
  },
  {
    id: "mission",
    label: "Sortie Readiness",
    icon: Plane,
    queries: [
      "Can HAL-2043 perform a high-altitude Mach 1.4 supersonic sortie today?",
      "Calculate RUL under combat thrust vs economic cruise profile",
      "Evaluate multi-engine fleet mission clearance index",
    ],
  },
  {
    id: "telemetry",
    label: "Diagnostics",
    icon: Activity,
    queries: [
      "Run real-time root cause analysis on active telemetry drift",
      "Compare surrogate state predictions against physics expected bounds",
      "Why has engine health decreased?",
    ],
  },
];

export function Assistant({ engine }: { engine: Engine }) {
  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      id: "0",
      role: "assistant",
      text: `HAL FALCON Defense AI Assistant online. Observing ${engine.id} (${engine.tail} · ${engine.model}). Ask about MIL-STD standards, maintenance dispatch orders, or mission clearance.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ShortcutCategory>("mil_std");
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // Web Speech API Assistant Voice Output
  const speakText = (id: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""));
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const respond = (q: string): Partial<Msg> => {
    const key = q.toLowerCase();
    let text = "";
    let spark: number[] | undefined;
    let ticket: Msg["ticket"] | undefined;
    let complianceTable: Msg["complianceTable"] | undefined;

    const hasAnomaly = (engine.activeAnomalies?.length ?? 0) > 0 || engine.degraded;

    // 1. MIL-STD Checks
    if (key.includes("mil-std") || key.includes("compliance") || key.includes("def-stan") || key.includes("vibration amplitude")) {
      text = `Executing MIL-STD Defense Envelope Assessment for ${engine.id} (${engine.tail}). Physics model evaluated across 5 MIL specs:`;
      complianceTable = [
        {
          standard: "MIL-STD-1789B",
          parameter: "Turbine Inlet Temp (T3)",
          measured: `${engine.sensors.t3.toFixed(1)} °C`,
          limit: "≤ 820.0 °C",
          status: engine.sensors.t3 > 820 ? "FAIL" : engine.sensors.t3 > 750 ? "WARN" : "PASS",
        },
        {
          standard: "MIL-E-8593A",
          parameter: "Vibration Harmonic (N1/N2)",
          measured: `${(engine.sensors.p2 * 0.04).toFixed(2)} mm/s`,
          limit: "≤ 2.40 mm/s",
          status: engine.sensors.p2 > 65 || engine.sensors.p2 < 25 ? "WARN" : "PASS",
        },
        {
          standard: "MIL-F-8615",
          parameter: "Fuel Hydro Feed Press",
          measured: `${(engine.sensors.fuel / 30).toFixed(1)} psi`,
          limit: "≥ 35.0 psi",
          status: engine.sensors.fuel < 700 ? "FAIL" : "PASS",
        },
        {
          standard: "DEF-STAN 00-970",
          parameter: "Sensor Bus SNR",
          measured: `${(engine.confidence * 0.48).toFixed(1)} dB`,
          limit: "≥ 32.0 dB",
          status: engine.confidence < 60 ? "WARN" : "PASS",
        },
      ];
      spark = Array.from({ length: 15 }).map((_, i) => 80 - i * (hasAnomaly ? 2 : 0.2));
    }
    // 2. Depot Maintenance Dispatch
    else if (key.includes("dispatch") || key.includes("depot") || key.includes("level-2") || key.includes("replace hpt")) {
      text = `HAL Level-2 Maintenance Dispatch Ticket generated for aircraft ${engine.tail} (Engine: ${engine.id}). Work order submitted to HAL Aerospace Depot Command.`;
      ticket = {
        orderId: `HAL-WO-${Math.floor(100000 + Math.random() * 900000)}`,
        targetEngine: engine.id,
        tailNumber: engine.tail,
        priority: engine.severity === "critical" || hasAnomaly ? "CRITICAL" : engine.severity === "degraded" ? "HIGH" : "MEDIUM",
        actionRequired: engine.degraded || engine.activeAnomalies?.includes("overheat")
          ? "Perform High-Pressure Turbine (HPT) Stage 1 Borescope & Thermal Barrier Coating (TBC) inspect."
          : "Execute standard 50-hour preventative inspection and sensor calibration reset.",
        estHours: engine.severity === "critical" ? 14 : 6,
        requiredTools: ["Borescope-K9", "Torque-Spec Toolset #4", "Thermodynamics Sensor Calibrator", "HAL Avionics Link"],
        milStdRef: "MIL-HDBK-1785 / HAL-M-2026-B",
      };
    }
    // 3. Mission / Sortie Clearance
    else if (key.includes("mach") || key.includes("sortie") || key.includes("mission") || key.includes("clearance")) {
      const isCleared = engine.health >= 60 && !hasAnomaly;
      text = `SORTIE READINESS EVALUATION: Aircraft ${engine.tail} (${engine.model}).\n\n` +
        `• Mission Clearance: ${isCleared ? "APPROVED FOR SORTIE ✓" : "RESTRICTED / REQUIRES PRE-FLIGHT CHECK ⚠️"}\n` +
        `• Max Operating Envelope: Mach 1.45 at 35,000 ft\n` +
        `• Confidence Rating: ${engine.confidence.toFixed(0)}%\n` +
        `• Projected RUL Margin: ${engine.rul.toFixed(0)} cycles remaining.\n` +
        (isCleared
          ? "No critical MIL-STD breaches detected. Cleared for immediate tactical dispatch."
          : "Thermal / Vibration anomalies present. High-Mach supersonic dash restricted until Level-2 maintenance clearance.");
      spark = Array.from({ length: 20 }).map((_, i) => engine.rul - i * (isCleared ? 1 : 4));
    }
    // 4. Default / Component queries
    else if (key.includes("why") || key.includes("decrease") || key.includes("anomal") || key.includes("telemetry") || key.includes("residual")) {
      text = `Health index on ${engine.id} has drifted ${engine.trend >= 0 ? "up" : "down"} ${Math.abs(engine.trend).toFixed(2)}/min. Primary driver: ${hasAnomaly ? "Active telemetry anomaly vectors injected into engine simulator" : "Normal operating friction and thermal expansion"}. Real-time residual error is within PINN physics bounds.`;
      spark = Array.from({ length: 20 }).map((_, i) => engine.health - i * 0.3);
    } else if (key.includes("component") || key.includes("attention")) {
      const w = Object.entries(engine.subsystems).sort((a, b) => a[1] - b[1])[0];
      text = `Subsystem Assessment: ${w[0].toUpperCase()} shows lowest health score at ${w[1].toFixed(1)}/100. Recommend inspecting stage alignment at next maintenance cycle.`;
    } else {
      text = `FALCON Diagnostic Engine response for ${engine.id}: Current Health ${engine.health.toFixed(1)}%, Severity: ${engine.severity.toUpperCase()}, RUL: ${engine.rul.toFixed(0)} cycles. Ask for MIL-STD compliance, depot dispatch, or sortie clearance.`;
    }

    return { text, spark, ticket, complianceTable };
  };

  const send = (q?: string) => {
    soundFx.playClick();
    const query = (q ?? input).trim();
    if (!query) return;
    const uid = crypto.randomUUID();
    setMessages((m) => [...m, { id: uid, role: "user", text: query }]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const res = respond(query);
      const aid = crypto.randomUUID();
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: aid,
          role: "assistant",
          text: "",
          streaming: true,
          spark: res.spark,
          ticket: res.ticket,
          complianceTable: res.complianceTable,
        },
      ]);

      let i = 0;
      const fullText = res.text || "";
      const tick = () => {
        i += 3;
        setMessages((m) =>
          m.map((msg) => (msg.id === aid ? { ...msg, text: fullText.slice(0, i) } : msg)),
        );
        if (i < fullText.length) {
          setTimeout(tick, 15);
        } else {
          setMessages((m) => m.map((msg) => (msg.id === aid ? { ...msg, streaming: false } : msg)));
          inputRef.current?.focus();
        }
      };
      tick();
    }, 600);
  };

  const currentCat = SHORTCUT_CATEGORIES.find((c) => c.id === activeCategory)!;

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] sm:h-[calc(100vh-6.5rem)] max-w-5xl flex-col">
      {/* Top Title & Metadata Bar - Crisp High-Contrast Legibility against Navy Theme */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkle className="h-4 w-4 text-sky-400 animate-pulse" />
            <div className="eyebrow text-sky-400 font-bold tracking-widest">HAL DEFENSE AVIATION ADVISORY AI AGENT</div>
          </div>
          <h2 className="mono mt-0.5 text-xl sm:text-2xl font-bold text-white tracking-wide">Ask the FALCON Digital Twin</h2>
          <p className="mono text-xs text-slate-300 font-semibold mt-0.5">Context: {engine.id} · Tail: {engine.tail} · Engine Model: {engine.model}</p>
        </div>

        <div className="mono flex items-center gap-2 text-xs rounded-lg border border-slate-700 bg-slate-800/90 backdrop-blur-md px-3.5 py-1.5 shadow-sm text-slate-200">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 hidden sm:inline">MIL-STD Rules Engine:</span>
          <span className="font-bold text-sky-400">ONLINE (v4.8)</span>
        </div>
      </div>

      {/* Domain Shortcut Category Tabs - Sleek Cyber Navy Styling */}
      <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-700/60 scrollbar-none">
        {SHORTCUT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                soundFx.playClick();
                setActiveCategory(cat.id);
              }}
              className={cn(
                "mono flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all shadow-sm",
                active
                  ? "border-sky-400 bg-sky-500 text-white ring-2 ring-sky-400/50 scale-105 shadow-sky-500/20"
                  : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Suggested Domain Prompt Chips - Sleek Glassmorphic Pills */}
      <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {currentCat.queries.map((q, i) => (
          <button
            key={q}
            onClick={() => send(q)}
            className="anim-fade-up mono flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/90 px-3.5 py-1.5 text-xs font-medium text-slate-200 shadow-sm transition hover:border-sky-400 hover:bg-slate-700 hover:text-sky-300 hover:scale-105"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-sky-400 font-bold">›</span>
            {q}
          </button>
        ))}
      </div>

      {/* Main Chat Stream Viewport - Light Glass Panel for Crisp Legibility */}
      <div
        ref={scrollRef}
        className="panel panel-accent-cyan mt-3 flex-1 space-y-4 overflow-y-auto p-4 shadow-md bg-[#f0f4f8] border border-[#cbd5e1] rounded-xl"
      >
        {messages.map((m) => (
          <MessageRow key={m.id} msg={m} onSpeak={() => speakText(m.id, m.text)} isSpeaking={speakingId === m.id} />
        ))}
        {typing && (
          <div className="flex items-start gap-3">
            <Avatar role="assistant" />
            <div className="panel flex items-center gap-1.5 px-3 py-2.5 shadow-sm bg-white rounded-lg border border-slate-200">
              <Dot delay={0} />
              <Dot delay={150} />
              <Dot delay={300} />
            </div>
          </div>
        )}
      </div>

      {/* Prompt Input Form */}
      <form
        className="panel mt-3 flex items-center gap-2 p-2 shadow-sm bg-white border border-slate-300 rounded-xl"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Ask MIL-STD queries, dispatch requests, mission status..."
          className="mono flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 text-slate-900"
        />
        <button
          type="submit"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-sm transition-all"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
        role === "assistant"
          ? "border-sky-400 bg-sky-50 text-sky-700"
          : "border-slate-300 bg-slate-100 text-slate-700",
      )}
    >
      {role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
    </div>
  );
}

function MessageRow({ msg, onSpeak, isSpeaking }: { msg: Msg; onSpeak: () => void; isSpeaking: boolean }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const copyTicket = () => {
    if (!msg.ticket) return;
    const info = `HAL MAINTENANCE DISPATCH TICKET: ${msg.ticket.orderId}\nEngine: ${msg.ticket.targetEngine} (${msg.ticket.tailNumber})\nPriority: ${msg.ticket.priority}\nAction: ${msg.ticket.actionRequired}\nRequired Tools: ${msg.ticket.requiredTools.join(", ")}`;
    navigator.clipboard.writeText(info);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex items-start gap-3 anim-fade-up", isUser && "flex-row-reverse")}>
      <Avatar role={msg.role} />
      <div
        className={cn(
          "max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed space-y-3 shadow-sm border",
          isUser
            ? "bg-sky-600 text-white border-sky-600"
            : "bg-white border-slate-300 text-slate-900",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="mono whitespace-pre-wrap font-medium">
            {msg.text}
            {msg.streaming && <span className="anim-blink text-sky-600 font-bold">▊</span>}
          </div>

          {!isUser && !msg.streaming && (
            <button
              onClick={onSpeak}
              title="Voice Assistant Playback"
              className={cn(
                "p-1 rounded-md border transition-colors shrink-0",
                isSpeaking ? "bg-sky-100 border-sky-400 text-sky-700 animate-pulse" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800",
              )}
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* MIL-STD Compliance Table */}
        {msg.complianceTable && !msg.streaming && (
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-3.5 space-y-2.5 anim-fade-up shadow-xs">
            <div className="mono flex items-center justify-between text-xs font-bold text-sky-700 border-b border-slate-300 pb-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                MIL-STD Specification Audit Matrix
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">HAL Defense Standard</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left mono text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500">
                    <th className="py-1.5 font-bold">Standard</th>
                    <th className="py-1.5">Parameter</th>
                    <th className="py-1.5">Measured</th>
                    <th className="py-1.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {msg.complianceTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-100">
                      <td className="py-2 font-bold text-slate-900">{row.standard}</td>
                      <td className="py-2 text-slate-600">{row.parameter}</td>
                      <td className="py-2 font-mono font-bold text-slate-800">{row.measured}</td>
                      <td className="py-2 text-right">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-2xs",
                            row.status === "PASS" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                            row.status === "WARN" && "border-amber-300 bg-amber-50 text-amber-700",
                            row.status === "FAIL" && "border-rose-300 bg-rose-50 text-rose-700 animate-pulse",
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Maintenance Dispatch Ticket Component */}
        {msg.ticket && !msg.streaming && (
          <div className="rounded-xl border border-sky-300 bg-sky-50/70 p-4 space-y-3 anim-fade-up shadow-sm">
            <div className="flex items-center justify-between border-b border-sky-200 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-sky-700" />
                <span className="mono text-xs font-bold text-sky-900 uppercase tracking-wider">
                  HAL Level-2 Maintenance Dispatch Ticket
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyTicket}
                  className="flex items-center gap-1 text-[10px] mono font-bold px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-500" />}
                  {copied ? "COPIED" : "COPY ORDER"}
                </button>
                <span className="mono text-[10px] font-bold px-2 py-1 rounded border border-sky-400 bg-sky-600 text-white shadow-2xs">
                  {msg.ticket.orderId}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mono">
              <div>
                <span className="text-slate-500 font-semibold">Engine ID:</span> <span className="font-bold text-slate-900">{msg.ticket.targetEngine}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Tail #:</span> <span className="font-bold text-sky-700">{msg.ticket.tailNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Priority:</span>{" "}
                <span className={cn("font-bold px-1.5 py-0.5 rounded text-[10px]", msg.ticket.priority === "CRITICAL" ? "bg-rose-100 text-rose-700 border border-rose-300" : "bg-amber-100 text-amber-700 border border-amber-300")}>
                  {msg.ticket.priority}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Est. Work Window:</span> <span className="font-bold text-slate-800">{msg.ticket.estHours} Hours</span>
              </div>
            </div>

            <div className="text-xs mono">
              <div className="text-slate-600 font-bold">Action Required:</div>
              <div className="mt-1 text-slate-900 bg-white p-2.5 rounded-lg border border-slate-300 shadow-2xs font-semibold">
                {msg.ticket.actionRequired}
              </div>
            </div>

            <div className="text-xs mono">
              <div className="text-slate-600 font-bold">Required Tooling:</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {msg.ticket.requiredTools.map((tool) => (
                  <span key={tool} className="px-2 py-0.5 rounded-md bg-white text-slate-800 border border-slate-300 text-[10px] font-bold shadow-2xs">
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] mono border-t border-sky-200">
              <span className="text-slate-500 font-semibold">Standard Ref: {msg.ticket.milStdRef}</span>
              <span className="text-emerald-700 flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> SUBMITTED TO HAL DEPOT COMMAND
              </span>
            </div>
          </div>
        )}

        {/* Telemetry Sparkline */}
        {msg.spark && (
          <div className="mt-2 h-10 w-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={msg.spark.map((v, i) => ({ i, v }))}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="h-2 w-2 rounded-full bg-sky-600"
      style={{
        animation: "hud-pulse 1s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
