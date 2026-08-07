"""
FALCON Digital Twin — Aerothon Dataset Loader
Aerothon 2026 | Team Avyay (IIT Indore x HAL)
"""

import os
import pandas as pd
from typing import Dict, Any, List

class AerothonDatasetLoader:
    """
    Parses and serves official Aerothon Turbojet Datasets (14 sensor parameters + 30,000 ground truth degradation cycles).
    """

    def __init__(self, dataset_dir: str):
        self.dataset_dir = dataset_dir
        self.default_file = os.path.join(dataset_dir, "turbojet_complete_dataset.csv")
        self.ground_truth_file = os.path.join(dataset_dir, "ground_truth.csv")

    def _get_engine_num(self, engine_id: str) -> int:
        """Extracts integer engine number from engine_id like 'TJ-04C' or '1'."""
        try:
            digits = "".join(filter(str.isdigit, str(engine_id)))
            return int(digits) if digits else 1
        except Exception:
            return 1

    def load_engine_cycles(self, engine_id: str = "TJ-04C", limit: int = 50) -> List[Dict[str, Any]]:
        """
        Loads time-series sensor & health cycles for a given engine from CSV datasets.
        Normalizes column names to lowercase standard keys.
        """
        eng_num = self._get_engine_num(engine_id)

        # 1. Try turbojet_complete_dataset.csv first (contains full sensor telemetry + health)
        if os.path.exists(self.default_file):
            try:
                df = pd.read_csv(self.default_file)
                col_name = next((c for c in df.columns if c.lower() in ["engineid", "engine_id", "id"]), None)
                if col_name:
                    filtered = df[(df[col_name] == eng_num) | (df[col_name] == str(eng_num))]
                    if not filtered.empty:
                        records = filtered.head(limit).to_dict(orient="records")
                        # Normalize keys to lowercase
                        normalized = [{k.lower(): v for k, v in r.items()} for r in records]
                        print(f"[DatasetLoader] Loaded {len(normalized)} complete dataset cycles for Engine {engine_id}")
                        return normalized
            except Exception as e:
                print(f"[DatasetLoader] Warning parsing turbojet_complete_dataset.csv: {e}")

        # 2. Try ground_truth.csv
        if os.path.exists(self.ground_truth_file):
            try:
                df_gt = pd.read_csv(self.ground_truth_file)
                col_name = next((c for c in df_gt.columns if c.lower() in ["engineid", "engine_id", "id"]), None)
                if col_name:
                    filtered = df_gt[(df_gt[col_name] == eng_num) | (df_gt[col_name] == str(eng_num))]
                    if not filtered.empty:
                        records = filtered.head(limit).to_dict(orient="records")
                        normalized = [{k.lower(): v for k, v in r.items()} for r in records]
                        print(f"[DatasetLoader] Loaded {len(normalized)} ground truth cycles for Engine {engine_id}")
                        return normalized
            except Exception as e:
                print(f"[DatasetLoader] Warning parsing ground_truth.csv: {e}")

        # 3. Synthetic physics dataset cycles generator fallback
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
