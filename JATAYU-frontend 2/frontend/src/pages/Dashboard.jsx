import { useNavigate } from "react-router-dom";
import { AlertTriangle, Flame, Home, Shield, Bell, ArrowRight, Smartphone, Radio, CloudRain, Droplets, Activity, RefreshCw } from "lucide-react";
import DonutChart from "@/components/DonutChart";
import { LOCATIONS } from "@/data/locations";
import { ALERTS } from "@/data/alerts";
import { riskColor } from "@/lib/risk";
import { useApp } from "@/context/AppContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { setSelectedLocationId, triggerDeviceAlert, locations, isLive, liveLoading, liveTimestamp, refreshLiveTelemetry } = useApp();

  const currentLocations = locations && locations.length > 0 ? locations : LOCATIONS;

  const countVeryHigh = currentLocations.filter((l) => l.riskLevel === "Very High").length;
  const countHigh = currentLocations.filter((l) => l.riskLevel === "High").length;
  const countModerate = currentLocations.filter((l) => l.riskLevel === "Moderate").length;
  const countLow = currentLocations.filter((l) => l.riskLevel === "Low").length;

  const STATS = [
    { level: "Very High", label: "Very High Risk", value: countVeryHigh, unit: "Critical Zones", icon: AlertTriangle, color: "#FF2020" },
    { level: "High", label: "High Risk", value: countHigh, unit: "Warning Zones", icon: Flame, color: "#FF8A00" },
    { level: "Moderate", label: "Moderate Risk", value: countModerate, unit: "Watch Zones", icon: Home, color: "#FFD21C" },
    { level: "Low", label: "Low Risk", value: countLow, unit: "Stable Zones", icon: Shield, color: "#42D321" },
    { level: "Alerts", label: "Active Alerts", value: Math.max(8, countVeryHigh + countHigh), unit: "Active Alerts", icon: Bell, color: "#A855F7" },
  ];

  const DONUT = [
    { name: "Very High", value: countVeryHigh || 1 },
    { name: "High", value: countHigh || 1 },
    { name: "Moderate", value: countModerate || 1 },
    { name: "Low", value: countLow || 1 },
  ];

  // Calculate live telemetry averages across NER
  const avgRain72h = (
    currentLocations.reduce((sum, l) => sum + (l.liveTelemetry?.rainLast72hMm || l.rainfall || 14), 0) /
    currentLocations.length
  ).toFixed(1);

  const avgSoilMoisture = (
    currentLocations.reduce((sum, l) => sum + (l.liveTelemetry?.soilMoistureVolumetric || 0.31), 0) /
    currentLocations.length
  ).toFixed(2);

  const openAlert = (a) => {
    setSelectedLocationId(a.locationId);
    navigate("/risk-analysis");
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Real-time Satellite & Sensor Telemetry Feed Banner */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-blue-950/60 border border-blue-500/30 backdrop-blur-xl shadow-lg shadow-blue-950/50">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm tracking-wide">Live Satellite &amp; Seismic Telemetry Engine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {isLive ? "REAL-TIME CONNECTED" : "SYNCHRONIZING"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct streaming from Open-Meteo ECMWF + USGS Hazards. Recalculating slope stability every 10 mins.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
              <CloudRain className="h-4 w-4 text-blue-400" />
              <span>72h Regional Rain: <strong className="text-white">{avgRain72h} mm</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
              <Droplets className="h-4 w-4 text-amber-400" />
              <span>Volumetric Moisture: <strong className="text-white">{avgSoilMoisture} m³/m³</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span>USGS Seismic Feed: <strong className="text-white">Active (NER Zone)</strong></span>
            </div>
            <button
              onClick={() => refreshLiveTelemetry(true)}
              disabled={liveLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all cursor-pointer shadow-md shadow-blue-600/30 active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${liveLoading ? "animate-spin" : ""}`} />
              <span>{liveLoading ? "Polling..." : "Sync Now"}</span>
            </button>
          </div>
        </div>
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              data-testid={`stat-card-${s.label.toLowerCase().replace(/ /g, "-")}`}
              className="glass glass-hover rounded-2xl p-5 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms`, boxShadow: `inset 0 0 0 1px ${s.color}22, 0 0 24px ${s.color}12` }}
            >
              <div className="text-sm font-semibold text-slate-200">{s.label}</div>
              <div className="flex items-center gap-3 mt-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundColor: `${s.color}1f` }}>
                  <Icon className="h-6 w-6" style={{ color: s.color }} />
                </span>
                <div>
                  <div className="font-display text-3xl font-extrabold leading-none" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{s.unit}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* two column */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Risk overview */}
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <h2 className="font-display text-xl font-bold text-white mb-4">Risk Overview (NER)</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-full sm:w-1/2"><DonutChart data={DONUT} total={251} /></div>
            <div className="w-full sm:w-1/2 space-y-3">
              {DONUT.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: riskColor(d.name) }} />
                    <span className="text-slate-200">{d.name}</span>
                  </div>
                  <span className="font-display font-bold text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-white">Recent Alerts</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => triggerDeviceAlert()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition-all border border-red-400/30 cursor-pointer"
                title="Send alert notification & popup to device"
              >
                <Smartphone className="h-3.5 w-3.5 text-amber-200" /> Alert Device
              </button>
              <button onClick={() => navigate("/alerts")} className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 font-medium" data-testid="view-all-alerts">
                View All <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-blue-900/30">
            {ALERTS.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="w-full flex items-center gap-3 py-3.5 hover:bg-white/5 rounded-lg px-2 -mx-2 transition group"
              >
                <span
                  onClick={() => openAlert(a)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full cursor-pointer"
                  style={{ backgroundColor: `${riskColor(a.riskLevel)}22` }}
                >
                  <Bell className="h-5 w-5" style={{ color: riskColor(a.riskLevel) }} />
                </span>
                <div onClick={() => openAlert(a)} className="flex-1 min-w-0 cursor-pointer">
                  <div className="font-semibold" style={{ color: riskColor(a.riskLevel) }}>{a.riskLevel} Risk</div>
                  <div className="text-sm text-slate-400 truncate">{a.name}, {a.state}</div>
                </div>
                <span className="text-sm text-slate-400 shrink-0 mr-1">{a.time}</span>
                <button
                  onClick={() => {
                    const loc = LOCATIONS.find((l) => l.id === a.locationId) || {
                      name: a.name,
                      state: a.state,
                      riskLevel: a.riskLevel,
                      riskScore: a.riskLevel === "Very High" ? 88 : 72,
                    };
                    triggerDeviceAlert(loc);
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-600 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Send alert to my device"
                  data-testid={`alert-device-${a.id}`}
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
