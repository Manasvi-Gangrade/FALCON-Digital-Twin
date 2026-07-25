"""
FALCON Digital Twin — Engineering Reasoning Engine (Knowledge Graph)
Aerothon 2026 | Team Avyay (IIT Indore x HAL)
"""

from typing import Dict, Any, List

class EngineeringReasoningEngine:
    """
    Lightweight Knowledge Graph connecting:
    Sensor Anomalies -> Subsystems -> Failure Mechanisms -> Depot Maintenance Actions -> Mission Impact.
    """

    def __init__(self):
        self.GRAPH_NODES = {
            "sensors": [
                {"id": "t3_surge", "label": "Turbine Inlet Temp (T3) Surge > 820°C", "parameter": "T3"},
                {"id": "p2_drop", "label": "Compressor Exit Pressure (P2) Drop", "parameter": "P2"},
                {"id": "fuel_high", "label": "Specific Fuel Consumption (SFC) Increase", "parameter": "Fuel"},
                {"id": "vib_high", "label": "Harmonic Vibration Amplitude Spike", "parameter": "N1/N2"},
            ],
            "subsystems": [
                {"id": "compressor", "label": "High Pressure Compressor (HPC)"},
                {"id": "combustor", "label": "Annular Combustor Chamber"},
                {"id": "turbine", "label": "High Pressure Turbine (HPT Stage 1)"},
            ],
            "failure_mechanisms": [
                {"id": "compressor_fouling", "label": "Aerodynamic Blade Fouling & Tip Clearance Wear"},
                {"id": "combustor_efficiency_loss", "label": "Fuel Nozzle Cavitation & Thermal Pattern Factor Shift"},
                {"id": "blade_erosion", "label": "HPT Thermal Barrier Coating (TBC) Spallation & Blade Erosion"},
            ],
            "actions": [
                {"id": "borescope_hpt", "label": "Schedule Emergency HPT Borescope Inspection"},
                {"id": "wash_compressor", "label": "Execute Level-1 Compressor Water Wash Procedure"},
                {"id": "recalibrate_hydro", "label": "Recalibrate Hydro-Mechanical Fuel Control Unit (FCU)"},
            ],
            "mission_impacts": [
                {"id": "thrust_penalty", "label": "+5.8% Fuel Consumption Penalty at Mach 1.4"},
                {"id": "sortie_restriction", "label": "Restricted Sortie Clearance (Max Mach 0.95)"},
                {"id": "depot_dispatch", "label": "Level-2 Depot Work Order Required within 12 Operating Hours"},
            ],
        }

    def explain_health_state(self, telemetry: Dict[str, Any], health: Dict[str, Any]) -> Dict[str, Any]:
        subsystems = health.get("subsystems", {})
        physics = health.get("physics_constraints", {})
        
        c_health = subsystems.get("compressor", 100.0)
        t_health = subsystems.get("turbine", 100.0)
        f_health = subsystems.get("combustor", 100.0)

        traces: List[Dict[str, Any]] = []

        if t_health < 75 or physics.get("egt_breach"):
            traces.append({
                "sensor_trigger": "Turbine Inlet Temp (T3) Surge > 820°C & EGT Envelope Violation",
                "subsystem": "High Pressure Turbine (HPT Stage 1)",
                "failure_mechanism": "HPT Thermal Barrier Coating (TBC) Spallation & Blade Erosion",
                "recommended_action": "Schedule Emergency HPT Borescope Inspection & Level-2 Depot Order",
                "mission_impact": "Restricted Sortie Clearance (Max Mach 0.95 Supersonic Cap)",
                "confidence_score": 94.5,
                "mil_std_ref": "MIL-STD-1789B / HAL-M-2026-B",
            })

        if c_health < 80:
            traces.append({
                "sensor_trigger": "Compressor Exit Pressure (P2) Drop relative to RPM curve",
                "subsystem": "High Pressure Compressor (HPC)",
                "failure_mechanism": "Aerodynamic Blade Fouling & Tip Clearance Wear",
                "recommended_action": "Execute Level-1 Compressor Water Wash Procedure",
                "mission_impact": "+5.8% Fuel Consumption Penalty at Mach 1.4 Tactical Profile",
                "confidence_score": 91.2,
                "mil_std_ref": "MIL-E-8593A",
            })

        if f_health < 80:
            traces.append({
                "sensor_trigger": "Specific Fuel Consumption (SFC) Rise without Thrust Gain",
                "subsystem": "Annular Combustor Chamber",
                "failure_mechanism": "Fuel Nozzle Cavitation & Thermal Pattern Factor Shift",
                "recommended_action": "Recalibrate Hydro-Mechanical Fuel Control Unit (FCU)",
                "mission_impact": "Reduced Combat Endurance (-18 Minutes Reheat Time)",
                "confidence_score": 88.7,
                "mil_std_ref": "MIL-F-8615",
            })

        if not traces:
            traces.append({
                "sensor_trigger": "Nominal Sensor Telemetry within Physics Envelope Bounds",
                "subsystem": "All Subsystems Nominal",
                "failure_mechanism": "Normal Friction & Thermal Operating Gradient",
                "recommended_action": "Continue Standard 50-Hour Preventative Maintenance Cycle",
                "mission_impact": "Approved for Full Supersonic Mach 1.45 Tactical Sortie",
                "confidence_score": 98.0,
                "mil_std_ref": "DEF-STAN 00-970",
            })

        return {
            "engine_id": telemetry.get("engine_id", "TJ-04C"),
            "traces": traces,
            "graph_nodes": self.GRAPH_NODES,
        }
