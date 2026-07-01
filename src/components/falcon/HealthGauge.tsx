import { useCountUp } from "@/lib/use-count-up";
import { severityOf, severityColor } from "@/lib/telemetry";

type Props = {
  value: number; // 0..100
  size?: number;
  label?: string;
  confidence?: number; // 0..100
};

export function HealthGauge({ value, size = 260, label = "HEALTH INDEX", confidence = 90 }: Props) {
  const v = useCountUp(value, 800, 1);
  const sev = severityOf(value);
  const color = severityColor(sev);

  const r = size / 2 - 22;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 135;
  const endAngle = 405; // 270deg sweep
  const sweep = endAngle - startAngle;
  const angle = startAngle + (sweep * v) / 100;
  const largeArc = (v / 100) * sweep > 180 ? 1 : 0;
  const p = (ang: number) => {
    const rad = (ang * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };
  const [sx, sy] = p(startAngle);
  const [ex, ey] = p(angle);
  const [tex, tey] = p(endAngle);
  const conf = Math.max(30, Math.min(100, confidence));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          <linearGradient id="gaugeArc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="45%" stopColor="#0ea5e9" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${tex} ${tey}`}
          fill="none"
          stroke="rgba(15, 23, 42, 0.06)"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`}
          fill="none"
          stroke="url(#gaugeArc)"
          strokeWidth={10}
          strokeLinecap="round"
          style={{ transition: "d 500ms cubic-bezier(0.16,1,0.3,1)" }}
        />
        {/* Confidence ring (subtle pulsing) */}
        <circle
          cx={cx}
          cy={cy}
          r={r - 16}
          fill="none"
          stroke={color}
          strokeOpacity={0.12}
          strokeWidth={conf / 30 + 1}
          className="anim-flicker"
        />
        {/* Tick marks */}
        {Array.from({ length: 28 }).map((_, i) => {
          const a = startAngle + (sweep * i) / 27;
          const rad = (a * Math.PI) / 180;
          const r1 = r + 6;
          const r2 = r + 12;
          return (
            <line
              key={i}
              x1={cx + r1 * Math.cos(rad)}
              y1={cy + r1 * Math.sin(rad)}
              x2={cx + r2 * Math.cos(rad)}
              y2={cy + r2 * Math.sin(rad)}
              stroke="rgba(15, 23, 42, 0.15)"
              strokeWidth={i % 4 === 0 ? 2 : 1}
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="eyebrow">{label}</div>
        <div
          className="mono text-6xl font-bold tabular-nums animate-pulse-subtle"
          style={{ color }}
        >
          {v.toFixed(1)}
        </div>
        <div className="mono text-xs text-hud-muted mt-1">
          CONFIDENCE {conf.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
