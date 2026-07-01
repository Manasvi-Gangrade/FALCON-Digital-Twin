import { useEffect, useRef, useState } from "react";
import { Send, Sparkle, Bot, User } from "lucide-react";
import type { Engine } from "@/lib/telemetry";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  spark?: number[];
};

const SUGGESTED = [
  "Why has engine health decreased?",
  "Which component requires attention?",
  "Can this engine complete the next mission?",
  "Show me RUL projection for TJ-04C.",
];

export function Assistant({ engine }: { engine: Engine }) {
  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      id: "0",
      role: "assistant",
      text: `FALCON assistant online. Currently observing ${engine.id} (${engine.tail}). Ask me anything about the fleet.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const respond = (q: string) => {
    const key = q.toLowerCase();
    let text = "";
    let spark: number[] | undefined;
    if (key.includes("why") || key.includes("decrease")) {
      text = `Health index on ${engine.id} has drifted ${engine.trend >= 0 ? "up" : "down"} ${Math.abs(engine.trend).toFixed(2)}/min. Primary contributors: elevated fuel flow (+3%) and EGT drift above the physics-informed envelope. Compressor efficiency remains within tolerance.`;
      spark = Array.from({ length: 20 }).map((_, i) => engine.health - i * 0.3);
    } else if (key.includes("component") || key.includes("attention")) {
      const w = Object.entries(engine.subsystems).sort((a, b) => a[1] - b[1])[0];
      text = `${w[0][0].toUpperCase() + w[0].slice(1)} shows the lowest sub-index at ${w[1].toFixed(1)}. Recommend borescope inspection within the next maintenance window.`;
    } else if (key.includes("mission") || key.includes("complete")) {
      text = `Confidence for the next mission profile: ${engine.confidence.toFixed(0)}%. RUL sits at ${engine.rul.toFixed(0)} cycles — ${engine.rul > 80 ? "cleared for next sortie with routine monitoring." : "recommend pre-flight inspection before dispatch."}`;
    } else if (key.includes("rul") || key.includes("projection")) {
      text = `Projected RUL: ${engine.rul.toFixed(0)} cycles. Assuming current degradation rate, the maintenance window closes in ~${Math.max(6, Math.round(engine.rul / 10))}h of operation.`;
      spark = Array.from({ length: 20 }).map((_, i) => engine.rul - i * 2);
    } else {
      text = `Analyzing ${engine.id}... Health index ${engine.health.toFixed(1)}, severity ${engine.severity.toUpperCase()}. Ask about specific components, projections, or mission readiness.`;
    }
    return { text, spark };
  };

  const send = (q?: string) => {
    const query = (q ?? input).trim();
    if (!query) return;
    const uid = crypto.randomUUID();
    setMessages((m) => [...m, { id: uid, role: "user", text: query }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const { text, spark } = respond(query);
      const aid = crypto.randomUUID();
      setTyping(false);
      setMessages((m) => [...m, { id: aid, role: "assistant", text: "", streaming: true, spark }]);
      // Stream chars
      let i = 0;
      const tick = () => {
        i += 2;
        setMessages((m) =>
          m.map((msg) => (msg.id === aid ? { ...msg, text: text.slice(0, i) } : msg)),
        );
        if (i < text.length) {
          setTimeout(tick, 18);
        } else {
          setMessages((m) => m.map((msg) => (msg.id === aid ? { ...msg, streaming: false } : msg)));
          inputRef.current?.focus();
        }
      };
      tick();
    }, 700);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-6.5rem)] max-w-4xl flex-col">
      <div className="flex items-center gap-2">
        <Sparkle className="h-4 w-4 text-hud-cyan" />
        <div className="eyebrow">FALCON Maintenance Assistant</div>
      </div>
      <h2 className="mono mt-1 text-2xl font-bold">Ask the Digital Twin</h2>
      <p className="mono text-xs text-hud-muted">Context: {engine.id} · {engine.tail} · {engine.model}</p>

      <div
        ref={scrollRef}
        className="panel panel-accent-cyan mt-4 flex-1 space-y-4 overflow-y-auto p-4 shadow-sm"
      >
        {messages.map((m) => (
          <MessageRow key={m.id} msg={m} />
        ))}
        {typing && (
          <div className="flex items-start gap-3">
            <Avatar role="assistant" />
            <div className="panel flex items-center gap-1.5 px-3 py-2.5 shadow-sm">
              <Dot delay={0} />
              <Dot delay={150} />
              <Dot delay={300} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGGESTED.map((s, i) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="anim-fade-up mono rounded-full border border-hud-border bg-[color:var(--hud-panel)] px-3 py-1 text-[11px] text-hud-muted transition hover:border-hud-cyan/50 hover:text-hud-cyan hover:shadow-sm"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="panel mt-3 flex items-center gap-2 p-2 shadow-sm"
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
          placeholder="Ask about health, RUL, mission readiness…"
          className="mono flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-hud-muted text-hud-text"
        />
        <button
          type="submit"
          className="flex h-9 w-9 items-center justify-center rounded-md bg-hud-cyan text-white hover:bg-hud-cyan/90 shadow-sm transition-colors"
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
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
        role === "assistant"
          ? "border-hud-cyan/30 bg-hud-cyan/5 text-hud-cyan"
          : "border-hud-border bg-black/5 text-hud-muted",
      )}
    >
      {role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
    </div>
  );
}

function MessageRow({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex items-start gap-3 anim-fade-up", isUser && "flex-row-reverse")}>
      <Avatar role={msg.role} />
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-hud-cyan/10 border border-hud-cyan/20 text-hud-text shadow-sm"
            : "panel shadow-sm",
        )}
      >
        <div className="mono">
          {msg.text}
          {msg.streaming && <span className="anim-blink text-hud-cyan">▊</span>}
        </div>
        {msg.spark && (
          <div className="mt-2 h-10 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={msg.spark.map((v, i) => ({ i, v }))}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#0ea5e9"
                  strokeWidth={1.5}
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
      className="h-1.5 w-1.5 rounded-full bg-hud-cyan"
      style={{
        animation: "hud-pulse 1s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}
