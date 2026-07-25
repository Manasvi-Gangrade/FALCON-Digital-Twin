/**
 * FALCON Digital Twin — API Client Bridge for Python FastAPI Backend
 * Aerothon 2026 | Team Avyay (IIT Indore x HAL)
 */

export const FASTAPI_BASE_URL = "http://localhost:8000";

export type BackendStatus = {
  online: boolean;
  service?: string;
  version?: string;
  pinnEngine?: string;
};

export async function checkBackendHealth(): Promise<BackendStatus> {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(2000), // 2s timeout
    });
    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        service: data.service,
        version: data.version,
        pinnEngine: data.pinn_engine,
      };
    }
  } catch (err) {
    // Backend offline or not started yet
  }
  return { online: false };
}

export async function evaluateTelemetryBackend(telemetry: any): Promise<any | null> {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/telemetry/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        engine_id: telemetry.id || "TJ-04C",
        cycle: 1,
        altitude_m: 8500.0,
        mach: 0.82,
        tamb: 242.15,
        pamb: 35600.0,
        rpm: telemetry.sensors.rpm,
        fuel: telemetry.sensors.fuel,
        p2: telemetry.sensors.p2 * 10000.0,
        t2: telemetry.sensors.t2 + 273.15,
        p3: telemetry.sensors.p3 * 10000.0,
        t3: telemetry.sensors.t3 + 273.15,
        p4: telemetry.sensors.p4 * 10000.0,
        t4: telemetry.sensors.t4 + 273.15,
      }),
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("FastAPI Telemetry Evaluation failed, falling back to TS physics engine.", err);
  }
  return null;
}

export async function runWhatIfSimulationBackend(params: {
  altitude_m: number;
  mach: number;
  fuel_multiplier: number;
  rpm_overload_percent: number;
  horizon_cycles: number;
}): Promise<any | null> {
  try {
    const res = await fetch(`${FASTAPI_BASE_URL}/api/whatif/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("FastAPI What-If Simulation failed, falling back to local simulation.", err);
  }
  return null;
}
