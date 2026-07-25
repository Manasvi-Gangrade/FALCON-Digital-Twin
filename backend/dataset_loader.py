"""
FALCON Digital Twin — Aerothon Dataset Loader
Aerothon 2026 | Team Avyay (IIT Indore x HAL)
"""

import os
import pandas as pd
from typing import Dict, Any, List

class AerothonDatasetLoader:
    """
    Parses and serves official Aerothon Turbojet Datasets (14 sensor parameters).
    """

    def __init__(self, dataset_dir: str):
        self.dataset_dir = dataset_dir
        self.default_file = os.path.join(dataset_dir, "turbojet_complete_dataset.csv")

    def load_engine_cycles(self, engine_id: str = "TJ-04C", limit: int = 50) -> List[Dict[str, Any]]:
        """
        Loads time-series sensor cycles for a given engine.
        Fallback to synthetic physics cycle generation if CSV file not found.
        """
        if os.path.exists(self.default_file):
            try:
                df = pd.read_csv(self.default_file)
                if "engine_id" in df.columns:
                    filtered = df[df["engine_id"] == engine_id]
                    if not filtered.empty:
                        return filtered.head(limit).to_dict(orient="records")
            except Exception as e:
                print(f"[DatasetLoader] Warning parsing CSV: {e}")

        # Synthetic physics dataset cycles generator fallback
        cycles = []
        for c in range(1, limit + 1):
            degradation_factor = (c / 50.0) ** 1.8
            cycles.append({
                "engine_id": engine_id,
                "cycle": c,
                "altitude_m": 8500.0,
                "mach": 0.82,
                "tamb_k": 242.15,
                "pamb_pa": 35600.0,
                "rpm": round(12500.0 - degradation_factor * 250.0, 1),
                "fuel_flow_kgs": round(0.85 + degradation_factor * 0.12, 3),
                "p2_pa": round(850000.0 - degradation_factor * 45000.0, 1),
                "t2_k": round(580.0 + degradation_factor * 12.0, 1),
                "p3_pa": round(820000.0 - degradation_factor * 50000.0, 1),
                "t3_k": round(1120.0 + degradation_factor * 65.0, 1),
                "p4_pa": round(260000.0 - degradation_factor * 10000.0, 1),
                "t4_k": round(880.0 + degradation_factor * 22.0, 1),
            })
        return cycles
