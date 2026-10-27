import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Bell, Map as MapIcon, Sliders, Smartphone, ShieldCheck, CheckCircle2, Radio } from "lucide-react";
import { useApp } from "@/context/AppContext";

function Toggle({ on, onClick, testId }) {
  return (
    <button onClick={onClick} data-testid={testId} className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${on ? "bg-blue-600" : "bg-slate-600"}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, settings, toggleSetting, subscribeSms, unsubscribeSms, smsStatus } = useApp();
  const [consentLoading, setConsentLoading] = useState(false);

  const rows = [
    { key: "alertNotifications", label: "Alert notifications", desc: "Receive push alerts for new risk warnings" },
    { key: "emailNotifications", label: "Email notifications", desc: "Get daily summaries and critical alerts by email" },
    { key: "fieldReportNotifications", label: "Field report notifications", desc: "Notify when field reports are verified" },
    { key: "autoRefresh", label: "Auto refresh", desc: "Automatically refresh telemetry every 5 minutes" },
    { key: "darkMode", label: "Dark mode", desc: "Command-center dark theme (recommended)" },
  ];

  const onToggle = (k, label) => {
    toggleSetting(k);
    toast.success(`${label} ${settings[k] ? "disabled" : "enabled"}`);
  };

  const handleToggleSmsConsent = async () => {
    if (!user?.phoneE164) {
      toast.info("Please verify your phone number to enable SMS alerts.");
      navigate("/login");
      return;
    }

    setConsentLoading(true);
    if (user.smsConsent) {
      const res = await unsubscribeSms();
      setConsentLoading(false);
      if (res.success) toast.success("Opted out of emergency SMS alerts.");
      else toast.error(res.error || "Failed to update consent.");
    } else {
      const res = await subscribeSms();
      setConsentLoading(false);
      if (res.success) toast.success("Subscribed to emergency SMS alerts.");
      else toast.error(res.error || "Failed to update consent.");
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl space-y-6">
      {/* Profile Card */}
      <div className="glass rounded-2xl p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-5">
          <User className="h-5 w-5 text-blue-400" />
          <h3 className="font-display text-lg font-semibold text-white">Profile</h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-300 text-slate-900 font-bold font-display text-2xl">
            {user?.initial || "U"}
          </span>
          <div className="grid sm:grid-cols-2 gap-4 flex-1">
            <div>
              <div className="text-xs text-slate-400">Name</div>
              <div className="text-white font-medium">{user?.name || "Field Responder"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Role</div>
              <div className="text-white font-medium">{user?.role || "Command Officer"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Verified Phone</div>
              <div className="text-white font-medium font-mono">
                {user?.phoneE164 ? (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    {user.phoneE164}
                  </span>
                ) : (
                  <span className="text-slate-400">Not verified (Demo session)</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Region</div>
              <div className="text-white font-medium">Northeast India (NER)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Phone & Carrier SMS Delivery Card */}
      <div className="glass rounded-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-400" />
            <h3 className="font-display text-lg font-semibold text-white">Emergency SMS Alerts</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {smsStatus?.configured ? "Twilio Carrier: Active" : "Twilio Carrier: Unconfigured"}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-900/40 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-white font-semibold text-sm flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Verified Destination Mobile Number
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {user?.phoneE164
                ? `Emergency early-warning alerts are routed to ${user.phoneE164}`
                : "No phone verified. Sign in with your phone to receive live SMS."}
            </div>
          </div>

          {user?.phoneE164 ? (
            <button
              onClick={handleToggleSmsConsent}
              disabled={consentLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                user.smsConsent
                  ? "bg-red-600/80 hover:bg-red-600 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {user.smsConsent ? "Opt-out of SMS Alerts" : "Opt-in to SMS Alerts"}
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Verify Phone Number
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 leading-relaxed space-y-1">
          <p>
            • <strong>Deduplication:</strong> Maximum 1 SMS per location every 10 minutes to prevent alert flooding.
          </p>
          <p>
            • <strong>Carrier Delivery:</strong> Real SMS messages are dispatched via Twilio Programmable SMS. When Twilio is unconfigured, delivery status accurately reports unconfigured without false claims.
          </p>
        </div>
      </div>

      {/* Notifications & Preferences */}
      <div className="glass rounded-2xl p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="h-5 w-5 text-blue-400" />
          <h3 className="font-display text-lg font-semibold text-white">Notifications &amp; Preferences</h3>
        </div>
        <div className="divide-y divide-blue-900/30">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between py-4">
              <div>
                <div className="text-white font-medium">{r.label}</div>
                <div className="text-sm text-slate-400">{r.desc}</div>
              </div>
              <Toggle on={settings[r.key]} onClick={() => onToggle(r.key, r.label)} testId={`settings-toggle-${r.key}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Map and System Preferences */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 animate-fade-up">
          <div className="flex items-center gap-2 mb-4">
            <MapIcon className="h-5 w-5 text-blue-400" />
            <h3 className="font-display text-lg font-semibold text-white">Map Preferences</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Default base map</span>
              <span className="text-white font-medium">Satellite</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Default region</span>
              <span className="text-white font-medium">Northeast India</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Default zoom</span>
              <span className="text-white font-medium">Level 7</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 animate-fade-up">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="h-5 w-5 text-blue-400" />
            <h3 className="font-display text-lg font-semibold text-white">System Preferences</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Alert threshold</span>
              <span className="text-white font-medium">Score ≥ 80</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">SMS Provider</span>
              <span className="text-white font-medium">Twilio Programmable SMS</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Engineering team</span>
              <span className="text-blue-400 font-semibold">APEX-AI-X</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">System status</span>
              <span className="text-emerald-400 font-medium">● Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
