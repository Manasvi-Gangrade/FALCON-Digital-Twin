# FALCON: Four-Stage Aeroengine Latent Component & Operational Network
### **Built for Aerothon 2026 (IIT Indore × Hindustan Aeronautics Limited)**

FALCON (Four-Stage Aeroengine Latent Component & Operational Network) is a decision-support cockpit and predictive maintenance interface for aerospace engineers. Designed to look and feel like an aerospace command center, it operates on a professional, solid-colored deep space navy palette (`#0c1220`) paired with high-legibility engineering cards.

---

## 🚀 Key Accomplishments & Features

1. **Aesthetic Command Center UI**:
   - Sleek deep space navy theme matching professional aviation control panels.
   - Glassmorphic panels with distinct accent borders (cyan, green, violet, amber, red) based on engine health levels.
   - Smooth micro-animations and entrance transitions for every view.

2. **Real-time Telemetry Processing**:
   - Real-time sensor simulation (RPM, fuel flow, T3 combustor temp, T4 turbine exit temp, inlet pressures).
   - Dynamic simulation toggles to trigger gradual engine degradation for compressor fouling or turbine erosion.

3. **Programmatic Dataset Ingestion**:
   - Direct parsing and mapping of the official HAL digital twin datasets (`train.csv`, `test.csv`, `ground_truth.csv`).
   - Joins telemetry variables with ground truth health sub-indices (Compressor, Combustor, Turbine) in real time.
   - Ingests and parses custom local CSV telemetry logs on-the-fly via a drag-and-drop / file upload zone.
   - Supports dual-axis charting (Y1 primary & Y2 secondary) for cross-variable telemetry mapping.

4. **Maintenance Assistant Chatbot**:
   - Custom AI assistant loaded with local engine telemetry context.
   - Provides instant answers to engine performance, RUL projections, and mission dispatch clearance.

5. **Priority Queue Board**:
   - An automated maintenance queue prioritized by combined health index, remaining useful life (RUL), and confidence metrics.

---

## 📊 Dataset Structure & Join Logic

The platform programmatically reads files from `public/Datasets/` and performs an in-memory database join:
- **`train.csv` & `test.csv`**: Contains multi-variable sensor telemetry (Altitude, Mach, Tamb, Pamb, RPM, Fuel Flow, T3, T4, etc.).
- **`ground_truth.csv`**: Contains physics-derived health indicators (`CompressorHealth`, `CombustorHealth`, `TurbineHealth`, `OverallHealth`) along with target engine performance measurements (`Thrust_N`, `TSFC_g_N_s`).

The workspace joins these records on **`EngineID`** and **`Cycle`** to reconstruct the digital twin timeline, allowing engineers to correlate thermodynamic shifts with physical component degradation.

---

## 🛠️ Getting Started

### 1. Install Dependencies
FALCON is built on Vite, React, TypeScript, and TailwindCSS.
```bash
npm install
# or
bun install
```

### 2. Run the Development Server
```bash
npm run dev
# or
bun dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build & Production Vercel Deployment
FALCON is fully optimized and configured for seamless deployment on Vercel:
```bash
npm run build
```
The custom `vercel.json` SPA routing is configured to preserve all static folder endpoints, ensuring that `/Datasets/train.csv`, `/Datasets/test.csv`, and `/Datasets/ground_truth.csv` remain accessible for client-side API requests.

---

## 📂 Project Architecture

```
FALCON-Digital-Twin/
├── Datasets/                 # Local source datasets
├── public/
│   └── Datasets/             # Served CSV telemetry files
│       ├── train.csv         # Training flight logs
│       ├── test.csv          # Testing flight logs
│       └── ground_truth.csv  # Engine health indicators
├── src/
│   ├── components/
│   │   └── falcon/
│   │       ├── pages/
│   │       │   ├── FleetOverview.tsx   # Fleet dashboard
│   │       │   ├── EngineDetail.tsx    # Subsystem detail charts
│   │       │   ├── DatasetExplorer.tsx # CSV Parser & Custom Uploader
│   │       │   ├── Assistant.tsx       # AI chatbot
│   │       │   └── PriorityBoard.tsx   # Maintenance queue
│   │       ├── FalconApp.tsx           # App Router & sidebar layout
│   │       └── TopBar.tsx              # System header
│   ├── lib/
│   │   ├── telemetry.ts      # Live physics simulation engine
│   │   └── utils.ts          # Core CSS helpers
│   ├── styles.css            # Custom theme configurations
│   └── main.tsx
├── vercel.json               # SPA routing & asset overrides
└── vite.config.ts
```
