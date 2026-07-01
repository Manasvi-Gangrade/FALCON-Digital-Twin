// Synthetic telemetry engine — seeded random walk with occasional anomalies.

export type Severity = "nominal" | "watch" | "degraded" | "critical";

export type Engine = {
  id: string;
  tail: string;
  model: string;
  health: number; // 0-100
  rul: number; // cycles remaining
  confidence: number; // 0-100
  trend: number; // -1..1
  severity: Severity;
  degraded: boolean;
  subsystems: {
    compressor: number;
    combustor: number;
    turbine: number;
  };
  sensors: {
    rpm: number;
    fuel: number; // kg/h
    t3: number; // egt-ish °C
    p2: number; // psi
  };
};

const seed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const initialEngines = (): Engine[] => {
  const bases = [
    { id: "TJ-04A", tail: "HAL-2041", model: "Adour Mk 811", h: 92 },
    { id: "TJ-04B", tail: "HAL-2042", model: "Adour Mk 811", h: 78 },
    { id: "TJ-04C", tail: "HAL-2043", model: "Kaveri K9+",   h: 64 },
    { id: "TJ-04D", tail: "HAL-2044", model: "Adour Mk 871", h: 87 },
    { id: "TJ-04E", tail: "HAL-2045", model: "Kaveri K9+",   h: 41 },
  ];
  return bases.map((b) => {
    const r = seed(b.id);
    const health = b.h + (r() - 0.5) * 3;
    return {
      id: b.id,
      tail: b.tail,
      model: b.model,
      health,
      rul: Math.round(60 + health * 6 + r() * 40),
      confidence: 70 + r() * 25,
      trend: (r() - 0.6) * 0.4,
      severity: severityOf(health),
      degraded: false,
      subsystems: {
        compressor: clamp(health + (r() - 0.5) * 8),
        combustor: clamp(health + (r() - 0.5) * 8),
        turbine: clamp(health + (r() - 0.5) * 10),
      },
      sensors: {
        rpm: 82 + r() * 8,
        fuel: 1200 + r() * 300,
        t3: 620 + r() * 60,
        p2: 42 + r() * 6,
      },
    };
  });
};

export function severityOf(h: number): Severity {
  if (h >= 80) return "nominal";
  if (h >= 65) return "watch";
  if (h >= 45) return "degraded";
  return "critical";
}

export const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// Advance one tick (~1s)
export function tickEngine(e: Engine, t: number): Engine {
  const jitter = (amp: number) => (Math.sin(t / 3 + e.id.length) + Math.random() - 0.5) * amp;
  const drift = e.degraded ? -0.35 : -0.02 + Math.random() * 0.04;
  const health = clamp(e.health + drift + jitter(0.12));
  const spike = e.degraded ? 1 : 0;
  return {
    ...e,
    health,
    trend: (health - e.health) * 3 + (e.degraded ? -0.5 : 0),
    rul: Math.max(0, e.rul + (e.degraded ? -0.6 : -0.05)),
    confidence: clamp(e.confidence + jitter(0.4) - (e.degraded ? 0.3 : 0), 40, 99),
    severity: severityOf(health),
    subsystems: {
      compressor: clamp(e.subsystems.compressor + drift * 1.4 + jitter(0.25)),
      combustor: clamp(e.subsystems.combustor + drift * 0.8 + jitter(0.2)),
      turbine: clamp(e.subsystems.turbine + drift * 1.6 + jitter(0.3)),
    },
    sensors: {
      rpm: clamp(e.sensors.rpm + jitter(0.4) + spike * (Math.random() * 1.5), 60, 100),
      fuel: e.sensors.fuel + jitter(15) + spike * (Math.random() * 60),
      t3: e.sensors.t3 + jitter(4) + spike * (Math.random() * 12),
      p2: e.sensors.p2 + jitter(0.6) + spike * (Math.random() * 1.2),
    },
  };
}

export const severityColor = (s: Severity) => {
  switch (s) {
    case "nominal": return "var(--hud-green)";
    case "watch": return "var(--hud-cyan)";
    case "degraded": return "var(--hud-amber)";
    case "critical": return "var(--hud-red)";
  }
};

export const severityLabel = (s: Severity) => s.toUpperCase();
