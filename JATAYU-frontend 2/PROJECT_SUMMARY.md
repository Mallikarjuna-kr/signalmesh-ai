# SignalMesh AI — Comprehensive Project Summary
**AI-Powered Landslide Risk Monitoring & Early Warning System**  
**Engineering Team:** APEX-AI-X  
**Primary Region:** Northeast India (NER) & High-Risk Mountainous Corridors  
**Live Development URL:** [http://localhost:3000](http://localhost:3000)

---

## 1. Executive Overview

**SignalMesh AI** is an advanced, command-center web application engineered to predict, detect, monitor, and mitigate landslide hazards in vulnerable mountainous regions. Developed by **Team APEX-AI-X**, the platform aggregates real-time multi-spectral sensor telemetry, geospatial satellite observation layers, and citizen-reported ground anomalies into a single, unified early warning command dashboard.

### Core Objectives:
- **Early Hazard Detection:** Provide early alerts before catastrophic slope failure occurs.
- **Multi-Sensor Fusion:** Synthesize 72-hour rainfall accumulation, soil moisture saturation, slope steepness, seismic activity, and vegetation cover.
- **Automated AI Verification:** Rapidly validate citizen-submitted ground reports through an intelligent 4-step AI vision and sensor cross-referencing pipeline.
- **Actionable Decision Support:** Offer disaster management authorities clear, localized risk metrics and community impact projections.

---

## 2. Key Modules & Functional Breakdown

### 2.1. Command Dashboard (`/dashboard`)
- **Key Risk Indicators (KRIs):** Instant summary counters for areas categorized by risk level:
  - **Very High Risk** (Red)
  - **High Risk** (Orange)
  - **Moderate Risk** (Yellow)
  - **Low Risk** (Green)
  - **Active Alerts** (Purple)
- **Regional Risk Distribution (Donut Chart):** Visual proportion of risk levels across monitored Northeast India sectors.
- **Live Alert Feed:** Immediate stream of active warnings with timestamp, severity, and direct navigation to detailed risk breakdown.

### 2.2. Interactive Geospatial GIS Map (`/map`)
- **High-Resolution Satellite Basemap:** Powered by Leaflet.js with ArcGIS World Imagery and geopolitical boundary overlays.
- **Interactive Risk Pins & Heatmaps:** Dynamic, pulsing map markers indicating high-risk zones (e.g., Dima Hasao, Champhai, West Garo Hills, Peren, Tamenglong).
- **Environmental Layer Controls:** Toggleable visual layers including Landslide Risk Heatmap, 72-hour Rainfall Accumulation, Settlement/Village Points, and Critical Infrastructure.
- **Smart Search & Fly-To Navigation:** Search by location or state with instant bounding-box zoom and sliding contextual inspection drawer.

### 2.3. Multi-Factor Risk Analysis (`/risk-analysis`)
- **Factor Breakdown Engine:** Quantitative metrics explaining *why* a specific location is flagged as dangerous:
  - 72-Hour Cumulative Rainfall (%)
  - Sub-surface Soil Moisture Saturation (%)
  - Terrain Slope Gradient (%)
  - Land Cover / Deforestation Change (%)
  - Seismic / Earthquake Activity
- **Vulnerability Projections:** Projected impact on roads/highways, human settlements, and critical lifeline infrastructure.
- **Historical Risk Trajectory:** Visual time-series charts illustrating score progression over the preceding 7–14 days.

### 2.4. Alerts & Warning Dispatch (`/alerts`)
- **Active & Historical Triage:** Dual-tab interface displaying ongoing emergencies versus resolved historical events.
- **Status Workflow:** Track alerts across lifecycle states (`New` → `Acknowledged` → `Closed`).
- **Detailed Alert Modal:** Provides incident coordinates, risk levels, and immediate recommended containment actions.

### 2.5. Field Reports & AI Verification (`/field-reports`)
- **Crowdsourced Citizen & Officer Reporting:** Form allowing field officers or citizens to report physical anomalies:
  - Observation types: *Tension Cracks*, *Slope Bulging*, *Rock Falls*, *Soil Creep*, *Water Seepage*, *Road Subsidence*.
  - Multi-photo upload with thumbnail preview and metadata capture.
- **4-Stage Automated AI Verification Pipeline:**
  1. **Image Quality & Integrity Check:** Validates resolution, lighting, and authentic camera capture.
  2. **Feature Detection:** AI computer vision identifies surface fissure cracks and displacement signs.
  3. **Sensor Cross-Referencing:** Cross-checks report coordinates against live satellite indices and moisture telemetry.
  4. **Risk Impact Assessment:** Evaluates whether the observation escalates local danger (e.g., elevating *High* to *Very High*) and calculates confidence percentage.

### 2.6. Report Activity Ledger (`/report-activity`)
- **Audit Table:** Comprehensive tabular registry of all submitted citizen/officer field reports with filterable statuses (`Submitted`, `Verified`, `Flagged`).
- **AI Verification Confidence & Risk Impact:** Displays calculated AI confidence scores and localized threat updates.

### 2.7. Environmental Data Layers (`/data-layers`)
- Dedicated command view to inspect and toggle individual sensor layers (Rainfall, Soil Moisture, Slope Gradient, Land Cover, Seismic Activity, Corridors, Infrastructure).

### 2.8. Historical Event Analysis (`/history`)
- Historical event frequency trends mapped across months and historical score patterns for predictive comparative analysis.

### 2.9. System Settings & Administration (`/settings`)
- Profile information for command staff.
- Configurable push alerts, daily email summaries, and telemetry refresh frequencies.
- Data source telemetry designation: **SignalMesh AI Telemetry**.
- System engineering hallmark: **Team APEX-AI-X**.

---

## 3. Technology Stack & Architecture

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 19, React Router v7 |
| **Build & Tooling** | Create React App / Craco, PostCSS, Autoprefixer |
| **Styling & Design System** | Tailwind CSS 3, Glassmorphism, CSS Custom Tokens (`tokens.css`) |
| **Mapping & GIS** | Leaflet.js, ArcGIS World Imagery Server |
| **Data Visualization** | Recharts (Responsive Line, Bar, and Gauge Charts) |
| **Icons & Micro-Interactions** | Lucide React, Framer Motion, Tailwindcss-Animate, Sonner Toaster |
| **State Management** | React Context API (`AppContext`) with persistent `localStorage` synchronization |

---

## 4. Design Aesthetics & Visual Identity

- **Theme:** High-contrast tactical command center with deep obsidian/navy backdrop (`#0A1020` / `#0E172A`).
- **Brand Colors:**
  - **Electric Cyan:** `#38BDF8` (Telemetry & Signal Pulses)
  - **Brushed Gold:** `#E9AC3F` / `#FFEBB0` (Brand Accents & Warning Highlights)
  - **Emergency Red:** `#FF2020` (Critical Risk)
  - **Alert Orange:** `#FF8A00` (High Risk)
  - **Caution Amber:** `#FFD21C` (Moderate Risk)
  - **Safe Emerald:** `#42D321` (Low Risk)
- **Glassmorphism:** Frosted translucent container panels (`backdrop-blur-md` with subtle blue borders).

---

## 5. Local Setup & Execution Guide

### Prerequisites
- Node.js (v18.x or v20.x or v22.x)
- npm (v9.x or v10.x)

### Running the Application
```bash
# Navigate to the frontend directory
cd "JATAYU-frontend 2/frontend"

# Launch development server
npm start
```

The application will launch on **[http://localhost:3000](http://localhost:3000)**.

### Demo Authentication Credentials
- **Username:** `admin`
- **Password:** `admin123`
- **Assigned Role:** Command Officer / Disaster Management Admin

---

## 6. Project Credentials & Attribution
- **Project Title:** SignalMesh AI
- **Engineering Team:** APEX-AI-X
- **Repository Structure:** Includes both the modern React application (`frontend/`) and static HTML preview interfaces.
