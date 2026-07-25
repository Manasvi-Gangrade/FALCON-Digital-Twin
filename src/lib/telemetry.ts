// Synthetic telemetry engine — seeded random walk with occasional anomalies.

export type Severity = "nominal" | "watch" | "degraded" | "critical";

export type AnomalyType = "overheat" | "vibration" | "fuel_drop" | "sensor_drift" | "mach_surge";

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
  activeAnomalies?: AnomalyType[];
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
      activeAnomalies: [],
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
  const anomalies = e.activeAnomalies || [];
  const isOverheat = anomalies.includes("overheat");
  const isVibration = anomalies.includes("vibration");
  const isFuelDrop = anomalies.includes("fuel_drop");
  const isSensorDrift = anomalies.includes("sensor_drift");
  const isMachSurge = anomalies.includes("mach_surge");

  const jitter = (amp: number) => (Math.sin(t / 3 + e.id.length) + Math.random() - 0.5) * amp;
  
  let extraDrift = 0;
  if (isOverheat) extraDrift -= 0.6;
  if (isVibration) extraDrift -= 0.5;
  if (isFuelDrop) extraDrift -= 0.4;
  if (isMachSurge) extraDrift -= 0.3;

  const drift = e.degraded ? -0.35 + extraDrift : -0.02 + Math.random() * 0.04 + extraDrift;
  const health = clamp(e.health + drift + jitter(0.12));

  // Subsystem impacts
  const compImpact = isVibration ? -0.8 : isMachSurge ? -0.4 : 0;
  const combImpact = isFuelDrop ? -0.9 : isOverheat ? -0.5 : 0;
  const turbImpact = isOverheat ? -1.2 : isMachSurge ? -0.6 : 0;

  // Sensor modifications under anomaly
  let rpmVal = e.sensors.rpm + jitter(0.4);
  if (isMachSurge) rpmVal = 97.5 + jitter(1.2);
  if (isVibration) rpmVal += (Math.random() - 0.5) * 6; // high frequency oscillation

  let fuelVal = e.sensors.fuel + jitter(15);
  if (isFuelDrop) fuelVal = Math.max(400, fuelVal - 450 + jitter(40));
  if (isMachSurge) fuelVal += 350;

  let t3Val = e.sensors.t3 + jitter(4);
  if (isOverheat) t3Val = Math.min(950, t3Val + 140 + jitter(10)); // Overheat surge > 850°C
  if (isSensorDrift) t3Val += (Math.random() - 0.5) * 80; // noisy drift

  let p2Val = e.sensors.p2 + jitter(0.6);
  if (isVibration) p2Val = Math.max(18, p2Val - 12 + jitter(2));
  if (isSensorDrift) p2Val += (Math.random() - 0.5) * 12;

  const spike = e.degraded ? 1 : 0;

  return {
    ...e,
    health,
    trend: (health - e.health) * 3 + (e.degraded || anomalies.length > 0 ? -0.5 : 0),
    rul: Math.max(0, e.rul + (e.degraded || anomalies.length > 0 ? -0.8 : -0.05)),
    confidence: clamp(e.confidence + jitter(0.4) - (e.degraded || anomalies.length > 0 ? 0.4 : 0), 30, 99),
    severity: severityOf(health),
    subsystems: {
      compressor: clamp(e.subsystems.compressor + drift * 1.4 + compImpact + jitter(0.25)),
      combustor: clamp(e.subsystems.combustor + drift * 0.8 + combImpact + jitter(0.2)),
      turbine: clamp(e.subsystems.turbine + drift * 1.6 + turbImpact + jitter(0.3)),
    },
    sensors: {
      rpm: clamp(rpmVal + spike * (Math.random() * 1.5), 50, 100),
      fuel: fuelVal + spike * (Math.random() * 60),
      t3: t3Val + spike * (Math.random() * 12),
      p2: clamp(p2Val + spike * (Math.random() * 1.2), 10, 80),
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
