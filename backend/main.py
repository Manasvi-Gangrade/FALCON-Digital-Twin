"""
FALCON Digital Twin — Python FastAPI Backend Microservice
Aerothon 2026 | Team Avyay (IIT Indore x HAL)
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from pinn_model import PINNSurrogateModel
from knowledge_graph import EngineeringReasoningEngine
from dataset_loader import AerothonDatasetLoader

app = FastAPI(
    title="FALCON Digital Twin — Physics-Informed Physics Service",
    description="Backend microservice for single-spool four-stage turbojet health monitoring, explainable reasoning, and RUL estimation.",
    version="1.0.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Services
pinn = PINNSurrogateModel()
reasoner = EngineeringReasoningEngine()
dataset_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Datasets"))
dataset_loader = AerothonDatasetLoader(dataset_dir)


class TelemetryInput(BaseModel):
    engine_id: str = Field(default="TJ-04C", description="Engine identifier")
    cycle: int = Field(default=1, description="Operating flight cycle")
    altitude_m: float = Field(default=8500.0, description="Altitude in meters")
    mach: float = Field(default=0.82, description="Mach number")
    tamb: float = Field(default=242.15, description="Ambient temperature (K)")
    pamb: float = Field(default=35600.0, description="Ambient pressure (Pa)")
    rpm: float = Field(default=12500.0, description="Shaft speed (RPM)")
    fuel: float = Field(default=0.85, description="Fuel flow rate (kg/s)")
    p2: float = Field(default=850000.0, description="Compressor exit pressure (Pa)")
    t2: float = Field(default=580.0, description="Compressor exit temp (K)")
    p3: float = Field(default=820000.0, description="Combustor exit pressure (Pa)")
    t3: float = Field(default=1120.0, description="Turbine inlet temp (K)")
    p4: float = Field(default=260000.0, description="Turbine exit pressure (Pa)")
    t4: float = Field(default=880.0, description="Turbine exit temp (K)")


class WhatIfInput(BaseModel):
    altitude_m: float = 8500.0
    mach: float = 0.82
    fuel_multiplier: float = 1.0  # 1.0 = nominal, 1.15 = +15% fuel burn
    rpm_overload_percent: float = 0.0  # 0% = nominal, 5.0 = +5% RPM
    horizon_cycles: int = 50


@app.get("/")
@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "FALCON Physics-Informed Digital Twin Core",
        "version": "v1.0.0",
        "pinn_engine": "Active (Physics Constraints Bound)",
        "dataset_files_present": os.path.exists(dataset_dir),
    }


@app.post("/api/telemetry/evaluate")
def evaluate_telemetry(data: TelemetryInput):
    sensors_dict = data.model_dump()
    health_result = pinn.predict_health(sensors_dict)
    explanation = reasoner.explain_health_state(sensors_dict, health_result)

    return {
        "engine_id": data.engine_id,
        "cycle": data.cycle,
        "health": health_result["overall_health"],
        "severity": health_result["severity"],
        "subsystems": health_result["subsystems"],
        "derived_features": health_result["derived_features"],
        "performance": health_result["performance"],
        "physics_constraints": health_result["physics_constraints"],
        "confidence_percent": health_result["confidence_percent"],
        "reasoning": explanation["traces"],
    }


@app.post("/api/reasoning/explain")
def explain_reasoning(data: TelemetryInput):
    sensors_dict = data.model_dump()
    health_result = pinn.predict_health(sensors_dict)
    return reasoner.explain_health_state(sensors_dict, health_result)


@app.post("/api/whatif/simulate")
def simulate_whatif(params: WhatIfInput):
    """
    Simulates counterfactual what-if operational envelopes over N cycles.
    """
    baseline_cycles = []
    hypothetical_cycles = []

    for c in range(1, params.horizon_cycles + 1):
        # Baseline flight cycle
        b_sensors = {
            "pamb": 35600.0, "tamb": 242.15, "rpm": 12500.0, "fuel": 0.85,
            "p2": 850000.0 - c * 400.0, "t2": 580.0 + c * 0.1,
            "p3": 820000.0 - c * 450.0, "t3": 1120.0 + c * 0.5,
            "p4": 260000.0, "t4": 880.0 + c * 0.2, "mach": 0.82
        }
        b_health = pinn.predict_health(b_sensors)

        # Hypothetical tweaked parameters cycle
        h_sensors = {
            "pamb": 35600.0 * (1.0 - (params.altitude_m - 8500.0) / 50000.0),
            "tamb": 242.15,
            "rpm": 12500.0 * (1.0 + params.rpm_overload_percent / 100.0),
            "fuel": 0.85 * params.fuel_multiplier,
            "p2": (850000.0 - c * 750.0 * params.fuel_multiplier),
            "t2": 580.0 + c * 0.2 * params.fuel_multiplier,
            "p3": 820000.0 - c * 800.0,
            "t3": 1120.0 + c * 1.2 * params.fuel_multiplier,
            "p4": 260000.0,
            "t4": 880.0 + c * 0.4,
            "mach": params.mach
        }
        h_health = pinn.predict_health(h_sensors)

        baseline_cycles.append({
            "cycle": c,
            "health": b_health["overall_health"],
            "thrust": b_health["performance"]["thrust_kn"],
            "sfc": b_health["performance"]["sfc"],
        })
        hypothetical_cycles.append({
            "cycle": c,
            "health": h_health["overall_health"],
            "thrust": h_health["performance"]["thrust_kn"],
            "sfc": h_health["performance"]["sfc"],
        })

    return {
        "params": params.model_dump(),
        "baseline_trajectory": baseline_cycles,
        "hypothetical_trajectory": hypothetical_cycles,
        "rul_delta_cycles": round(hypothetical_cycles[-1]["health"] - baseline_cycles[-1]["health"], 1),
    }


@app.get("/api/dataset/cycles")
def get_dataset_cycles(engine_id: str = "TJ-04C", limit: int = 50):
    return dataset_loader.load_engine_cycles(engine_id=engine_id, limit=limit)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
