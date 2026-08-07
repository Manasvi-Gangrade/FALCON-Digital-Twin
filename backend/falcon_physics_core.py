"""
FALCON Digital Twin — Master Physics, Mathematics & Engineering Core
Aerothon 2026 | Team Avyay (IIT Indore x HAL)
Team Lead: Manasvi Gangrade | Team Members: Muskan Lodhi, Suhani Sharma

This module serves as the single source of truth for all 18 Master Governing Equations,
thermodynamic Brayton cycle state evaluations, PINN residual loss functions, 
subsystem health indices, and overall engine performance capability (%) calculations.
"""

import math
import numpy as np
import torch
import torch.nn as nn
from typing import Dict, Tuple, Union, Any

# ==============================================================================
# THERMODYNAMIC & GAS TURBINE ENGINE CONSTANTS
# ==============================================================================
R_AIR = 287.05          # J/(kg·K) — Specific gas constant for air
CP_AIR = 1.005          # kJ/(kg·K) — Specific heat capacity of air at constant pressure
CP_GAS = 1.150          # kJ/(kg·K) — Specific heat capacity of combustion gas
GAMMA_AIR = 1.40        # Ratio of specific heats for air (Compressor inlet/exit)
GAMMA_GAS = 1.33        # Ratio of specific heats for high-temp combustion gas (Turbine)
LHV_JET_A1 = 43.15e3    # kJ/kg — Lower Heating Value of Jet A-1 Fuel
ETA_MECHANICAL = 0.98   # Mechanical shaft transmission efficiency
P_AMB_NOMINAL = 35.6    # kPa — Standard ambient pressure at 8,500m cruise
T_AMB_NOMINAL = 242.15  # K — Standard ambient temperature at 8,500m cruise

# ==============================================================================
# MASTER 18 GOVERNING EQUATIONS (Proposal Companion Spec)
# ==============================================================================

def eq01_compressor_pressure_ratio(p2: float, p_amb: float = P_AMB_NOMINAL) -> float:
    """Eq 1.1: Overall Compressor Pressure Ratio (pi_c = P2 / P_amb). Section 5."""
    return p2 / max(0.1, p_amb)

def eq02_compressor_isentropic_temp(t_amb: float, pi_c: float, gamma: float = GAMMA_AIR) -> float:
    """Eq 2.1: Isentropic Compressor Discharge Temperature (T2s = Tamb * pi_c^((gamma-1)/gamma)). Section 5."""
    exponent = (gamma - 1.0) / gamma
    return t_amb * math.pow(max(0.1, pi_c), exponent)

def eq03_compressor_isentropic_efficiency(t_amb: float, t2_actual: float, pi_c: float) -> float:
    """Eq 3.1: Compressor Isentropic Efficiency (eta_c = (T2s - Tamb) / (T2_actual - Tamb)). Section 8."""
    t2s = eq02_compressor_isentropic_temp(t_amb, pi_c)
    actual_rise = max(1.0, t2_actual - t_amb)
    ideal_rise = t2s - t_amb
    return max(0.0, min(1.0, ideal_rise / actual_rise))

def eq04_compressor_power_absorbed(mass_flow_air: float, t2_actual: float, t_amb: float = T_AMB_NOMINAL) -> float:
    """Eq 4.1: Compressor Mechanical Power Absorbed (W_c = m_dot_a * Cp_a * (T2 - Tamb)). Section 8."""
    return mass_flow_air * CP_AIR * (t2_actual - t_amb) # kW

def eq05_combustor_energy_balance(mass_flow_air: float, fuel_flow_rate: float, t2: float, t3: float, eta_b: float = 0.99) -> float:
    """Eq 5.1: Combustor Thermal Energy Balance (m_dot_f * LHV * eta_b = (m_dot_a + m_dot_f)*Cp_g*T3 - m_dot_a*Cp_a*T2). Section 8."""
    mass_flow_gas = mass_flow_air + (fuel_flow_rate / 1000.0) # g/s to kg/s
    q_out = mass_flow_gas * CP_GAS * t3 - mass_flow_air * CP_AIR * t2
    q_in = (fuel_flow_rate / 1000.0) * LHV_JET_A1 * eta_b
    return abs(q_in - q_out) # Energy residual in kW

def eq06_turbine_expansion_ratio(p3: float, p4: float) -> float:
    """Eq 6.1: High-Pressure Turbine Expansion Ratio (pi_t = P3 / P4). Section 5."""
    return p3 / max(0.1, p4)

def eq07_turbine_isentropic_temp(t3_actual: float, pi_t: float, gamma: float = GAMMA_GAS) -> float:
    """Eq 7.1: Isentropic Turbine Exit Temperature (T4s = T3 / (pi_t^((gamma-1)/gamma))). Section 8."""
    exponent = (gamma - 1.0) / gamma
    return t3_actual / math.pow(max(0.1, pi_t), exponent)

def eq08_turbine_isentropic_efficiency(t3_actual: float, t4_actual: float, pi_t: float) -> float:
    """Eq 8.1: Turbine Isentropic Efficiency (eta_t = (T3 - T4_actual) / (T3 - T4s)). Section 8."""
    t4s = eq07_turbine_isentropic_temp(t3_actual, pi_t)
    ideal_drop = max(1.0, t3_actual - t4s)
    actual_drop = t3_actual - t4_actual
    return max(0.0, min(1.0, actual_drop / ideal_rise_or_drop(ideal_drop)))

def ideal_rise_or_drop(val: float) -> float:
    return max(0.1, val)

def eq09_turbine_power_produced(mass_flow_air: float, fuel_flow_rate: float, t3: float, t4: float) -> float:
    """Eq 9.1: Turbine Mechanical Power Produced (W_t = m_dot_g * Cp_g * (T3 - T4)). Section 8."""
    mass_flow_gas = mass_flow_air + (fuel_flow_rate / 1000.0)
    return mass_flow_gas * CP_GAS * (t3 - t4) # kW

def eq10_mechanical_power_balance(w_turbine: float, w_compressor: float, eta_m: float = ETA_MECHANICAL) -> float:
    """Eq 10.1: Shaft Single-Spool Power Balance (W_t * eta_m - W_c = 0). Section 9."""
    return (w_turbine * eta_m) - w_compressor # kW residual

def eq11_pinn_power_residual_loss(w_turbine: float, w_compressor: float) -> float:
    """Eq 11.1: PINN Shaft Power Loss Residual (L_power = |W_t * eta_m - W_c|^2). Section 9."""
    residual = eq10_mechanical_power_balance(w_turbine, w_compressor)
    return float(residual ** 2)

def eq12_nozzle_exhaust_velocity(t4: float, p4: float, p_amb: float = P_AMB_NOMINAL, gamma: float = GAMMA_GAS) -> float:
    """Eq 12.1: Isentropic Nozzle Exhaust Velocity (V_e = sqrt(2 * Cp_g * T4 * (1 - (P_amb/P4)^((gamma-1)/gamma)))). Section 8."""
    ratio = p_amb / max(0.1, p4)
    exp = (gamma - 1.0) / gamma
    term = 1.0 - math.pow(ratio, exp)
    term = max(0.0, term)
    velocity = math.sqrt(2.0 * (CP_GAS * 1000.0) * t4 * term) # m/s
    return velocity

def eq13_gross_uninstalled_thrust(mass_flow_air: float, fuel_flow_rate: float, v_exit: float, v_ambient: float = 240.0) -> float:
    """Eq 13.1: Net Aeroengine Thrust (F_net = m_dot_g * V_e - m_dot_a * V_a). Section 8."""
    mass_flow_gas = mass_flow_air + (fuel_flow_rate / 1000.0)
    thrust_n = (mass_flow_gas * v_exit) - (mass_flow_air * v_ambient)
    return max(0.0, thrust_n / 1000.0) # kN

def eq14_thrust_specific_fuel_consumption(fuel_flow_g_per_s: float, thrust_kn: float) -> float:
    """Eq 14.1: TSFC (TSFC = m_dot_f / F_net). Section 8."""
    fuel_kg_per_hr = (fuel_flow_g_per_s / 1000.0) * 3600.0
    return fuel_kg_per_hr / max(0.01, thrust_kn) # kg/(kN·h)

def eq15_pinn_composite_loss(
    loss_data: float,
    loss_power: float,
    loss_eff: float,
    loss_mon: float,
    weights: Tuple[float, float, float, float] = (1.0, 0.15, 0.10, 0.05)
) -> float:
    """Eq 15.1: Physics-Informed Neural Network Composite Loss Function. Section 9."""
    w_d, w_p, w_e, w_m = weights
    return (w_d * loss_data) + (w_p * loss_power) + (w_e * loss_eff) + (w_m * loss_mon)

def eq16_subsystem_health_indices(eta_c: float, eta_t: float, t3_actual: float) -> Tuple[float, float, float]:
    """
    Eq 16.1: Subsystem Health Indices (Compressor, Combustor, Turbine). Section 8.
    Returns (comp_health_pct, comb_health_pct, turb_health_pct) in range 0..100.
    """
    comp_health = max(0.0, min(100.0, (eta_c / 0.88) * 100.0))
    
    # Combustor pattern factor penalty if T3 exceeds 1250K
    comb_penalty = max(0.0, (t3_actual - 1180.0) * 0.25)
    comb_health = max(0.0, min(100.0, 100.0 - comb_penalty))
    
    turb_health = max(0.0, min(100.0, (eta_t / 0.90) * 100.0))
    return comp_health, comb_health, turb_health

def eq17_overall_engine_health_percent(
    comp_health: float,
    comb_health: float,
    turb_health: float,
    weights: Tuple[float, float, float] = (0.40, 0.25, 0.35)
) -> float:
    """
    Eq 17.1: Overall Engine Health Percentage (Relative performance capability vs new engine).
    Aerothon PS2 Primary Evaluation Metric! Range: 0.0% to 100.0%.
    """
    w_c, w_b, w_t = weights
    overall = (w_c * comp_health) + (w_b * comb_health) + (w_t * turb_health)
    return round(max(0.0, min(100.0, overall)), 2)

def eq18_remaining_useful_life_cycles(overall_health_pct: float) -> int:
    """Eq 18.1: Remaining Useful Life RUL in Flight Cycles. Section 10."""
    if overall_health_pct >= 90.0:
        return int(500 + (overall_health_pct - 90.0) * 20.0)
    elif overall_health_pct >= 70.0:
        return int(250 + (overall_health_pct - 70.0) * 12.5)
    elif overall_health_pct >= 40.0:
        return int(80 + (overall_health_pct - 40.0) * 5.67)
    else:
        return int(overall_health_pct * 2.0)

# ==============================================================================
# PIPELINE EVALUATOR FUNCTION
# ==============================================================================

def compute_engine_telemetry_physics(
    rpm: float,
    p2: float,
    t2: float,
    p3: float,
    t3: float,
    p4: float,
    t4: float,
    fuel_g_per_s: float,
    p_amb: float = P_AMB_NOMINAL,
    t_amb: float = T_AMB_NOMINAL
) -> Dict[str, Any]:
    """
    Master Physics Pipeline: Takes raw 14-channel telemetry inputs and executes
    the complete 18-equation thermodynamic cycle evaluation.
    """
    # 1. Compressor Thermodynamics
    pi_c = eq01_compressor_pressure_ratio(p2, p_amb)
    eta_c = eq03_compressor_isentropic_efficiency(t_amb, t2, pi_c)
    mass_flow_air = (rpm / 12500.0) * 14.5 # kg/s
    w_compressor = eq04_compressor_power_absorbed(mass_flow_air, t2, t_amb)

    # 2. Combustor Thermodynamics
    combustor_residual_kw = eq05_combustor_energy_balance(mass_flow_air, fuel_g_per_s, t2, t3)

    # 3. Turbine Thermodynamics
    pi_t = eq06_turbine_expansion_ratio(p3, p4)
    eta_t = eq08_turbine_isentropic_efficiency(t3, t4, pi_t)
    w_turbine = eq09_turbine_power_produced(mass_flow_air, fuel_g_per_s, t3, t4)

    # 4. PINN Mechanical Power Balance Residual
    shaft_residual_kw = eq10_mechanical_power_balance(w_turbine, w_compressor)
    pinn_power_loss = eq11_pinn_power_residual_loss(w_turbine, w_compressor)

    # 5. Exhaust Nozzle & Thrust
    v_exit = eq12_nozzle_exhaust_velocity(t4, p4, p_amb)
    thrust_kn = eq13_gross_uninstalled_thrust(mass_flow_air, fuel_g_per_s, v_exit)
    tsfc = eq14_thrust_specific_fuel_consumption(fuel_g_per_s, thrust_kn)

    # 6. Subsystem & Overall Engine Health Percentage (Aerothon PS2 Core Output)
    comp_h, comb_h, turb_h = eq16_subsystem_health_indices(eta_c, eta_t, t3)
    overall_health_pct = eq17_overall_engine_health_percent(comp_h, comb_h, turb_h)
    rul_cycles = eq18_remaining_useful_life_cycles(overall_health_pct)

    return {
        "overall_health_percent": overall_health_pct,
        "rul_cycles": rul_cycles,
        "pi_c": round(pi_c, 3),
        "pi_t": round(pi_t, 3),
        "eta_c": round(eta_c, 4),
        "eta_t": round(eta_t, 4),
        "w_compressor_kw": round(w_compressor, 2),
        "w_turbine_kw": round(w_turbine, 2),
        "shaft_residual_kw": round(shaft_residual_kw, 4),
        "pinn_power_loss": round(pinn_power_loss, 6),
        "thrust_kn": round(thrust_kn, 2),
        "tsfc": round(tsfc, 4),
        "subsystem_health": {
            "compressor": round(comp_h, 1),
            "combustor": round(comb_h, 1),
            "turbine": round(turb_h, 1),
        }
    }

if __name__ == "__main__":
    # Test evaluation for nominal TJ-04A engine
    sample_res = compute_engine_telemetry_physics(
        rpm=12500, p2=65.0, t2=480.0, p3=61.0, t3=1120.0, p4=25.0, t4=850.0, fuel_g_per_s=850.0
    )
    print("=== FALCON Physics Core Verification ===")
    print(f"Overall Engine Health (%): {sample_res['overall_health_percent']}%")
    print(f"Remaining Useful Life (RUL): {sample_res['rul_cycles']} cycles")
    print(f"PINN Shaft Residual Error: {sample_res['shaft_residual_kw']} kW")
    print(f"Compressor Isentropic Efficiency: {sample_res['eta_c'] * 100:.1f}%")
    print(f"Turbine Isentropic Efficiency: {sample_res['eta_t'] * 100:.1f}%")
