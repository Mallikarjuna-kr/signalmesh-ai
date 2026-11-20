import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BellRing,
  Volume2,
  VolumeX,
  Share2,
  Navigation,
  X,
  Smartphone,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Send,
  AlertCircle,
  Clock,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { riskColor } from "@/lib/risk";
import { useApp, API_BASE } from "@/context/AppContext";

// Synthesizes a clean emergency warning beep using Web Audio API
function playEmergencySound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 tone
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35); // drop to A4
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.45);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.95);
  } catch (e) {
    console.warn("Audio playback not permitted or unavailable", e);
  }
}

export default function MobileEmergencyAlertModal({ alertData, onClose }) {
  const navigate = useNavigate();
  const { user, sendEmergencySms, smsStatus } = useApp();

  const [muted, setMuted] = useState(false);
  const [notifSent, setNotifSent] = useState(false);

  // SMS Dispatch state
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null);

  const locName = alertData?.name || "Dima Hasao";
  const stateName = alertData?.state || "Assam";
  const riskLevel = alertData?.riskLevel || "Very High";
  const riskScore = alertData?.riskScore || 87;
  const rainfall = alertData?.rainfall || 85;
  const soilMoisture = alertData?.soilMoisture || 78;
  const slope = alertData?.slopeGradient || 82;
  const color = riskColor(riskLevel);

  const isPhoneVerified = Boolean(user && user.verified && user.phoneE164);
  const hasSmsConsent = Boolean(user && user.smsConsent);

  // Play audio and vibrate mobile device on popup open
  useEffect(() => {
    if (!muted) {
      playEmergencySound();
    }

    // Trigger physical hardware vibration on mobile phones
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 600]);
    }

    // Trigger native browser notification
    triggerNativeDeviceNotification();
  }, [alertData]); // eslint-disable-line

  const triggerNativeDeviceNotification = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.info("Browser notifications not supported in this browser.");
      return;
    }

    const showNotif = () => {
      try {
        const n = new Notification(`🚨 CRITICAL HAZARD: ${locName}, ${stateName}`, {
          body: `High Landslide Danger (Score ${riskScore}/100). Rainfall ${rainfall}% & Soil Moisture ${soilMoisture}%. Evacuate vulnerable slopes immediately.`,
          icon: "/signalmesh-logo.svg",
          badge: "/signalmesh-logo.svg",
          tag: `signalmesh-alert-${locName}`,
          requireInteraction: true,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        setNotifSent(true);
      } catch (err) {
        console.warn("Could not dispatch native notification", err);
      }
    };

    if (Notification.permission === "granted") {
      showNotif();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          showNotif();
          toast.success("Device notification permission granted!");
        } else {
          toast.error("Notification permission dismissed.");
        }
      });
    } else {
      toast.warning("Notification permission is blocked in browser settings.");
    }
  };

  // Dispatch real SMS through backend Twilio service
  const handleDispatchSms = async (force = false) => {
    if (!isPhoneVerified) {
      toast.error("Please sign in with your phone number to receive SMS alerts.");
      return;
    }

    setSmsSending(true);
    setSmsResult(null);

    const res = await sendEmergencySms(
      {
        id: alertData?.id || "dima-hasao",
        name: locName,
        state: stateName,
        riskLevel,
        riskScore,
        rainfall: `${rainfall}%`,
        soilMoisture: `${soilMoisture}%`,
      },
      force
    );

    setSmsSending(false);
    setSmsResult(res);

    if (res.success) {
      if (res.status === "dev_sandbox_echoed") {
        toast.info("Dev Sandbox: SMS payload logged in backend terminal (Twilio unconfigured in .env).");
      } else {
        toast.success(`Emergency SMS dispatched via Twilio! Status: ${res.status}`);
      }
    } else {
      if (res.code === "COOLDOWN_ACTIVE") {
        toast.warning(res.error);
      } else if (res.status === "unconfigured") {
        toast.warning("Twilio SMS provider is unconfigured in backend/.env.");
      } else {
        toast.error(res.error || "SMS delivery failed.");
      }
    }
  };

  const handleShare = async () => {
    const text = `🚨 [EMERGENCY ALERT] SignalMesh AI: ${riskLevel.toUpperCase()} LANDSLIDE RISK detected in ${locName}, ${stateName}. Risk score ${riskScore}/100. High soil saturation & steep slope. Take immediate precautions! http://localhost:3000/alerts`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SignalMesh AI Alert — ${locName}`,
          text: text,
          url: window.location.href,
        });
      } catch (e) {
        // user cancelled share
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Emergency message copied to clipboard!");
    }
  };

  const handleViewMap = () => {
    onClose();
    navigate("/map");
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-[#0e172a] border-2 border-red-500/80 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.45)] overflow-hidden animate-scale-up my-auto"
        role="alertdialog"
        aria-modal="true"
      >
        {/* Top Emergency Flasher Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-5 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
            </span>
            <span className="font-display font-extrabold text-xs sm:text-sm tracking-wider uppercase">
              Emergency Mobile Hazard Broadcast
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMuted((m) => !m);
                if (muted) playEmergencySound();
              }}
              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
              title={muted ? "Unmute Alarm" : "Mute Alarm"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
              title="Close Dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Main Threat Badge */}
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 shrink-0">
              <ShieldAlert className="h-8 w-8 animate-pulse text-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-red-500 text-white shadow-md shadow-red-500/30">
                  {riskLevel} Risk Alert
                </span>
                <span className="text-xs text-slate-400">
                  Target:{" "}
                  <strong className="text-slate-200">
                    {isPhoneVerified ? user.maskedPhone : "Local Browser Session"}
                  </strong>
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-white mt-1.5 truncate">
                {locName}, {stateName}
              </h2>
            </div>
          </div>

          {/* Risk Metrics Quick Matrix */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <div>
              <div className="text-[11px] text-slate-400">Risk Score</div>
              <div className="font-display text-xl font-extrabold text-red-400 mt-0.5">
                {riskScore}<span className="text-xs text-slate-500">/100</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">72h Rainfall</div>
              <div className="font-display text-xl font-extrabold text-blue-400 mt-0.5">
                {rainfall}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Soil Moisture</div>
              <div className="font-display text-xl font-extrabold text-amber-400 mt-0.5">
                {soilMoisture}%
              </div>
            </div>
          </div>

          {/* Safety Advisory Banner */}
          <div className="rounded-2xl p-3.5 bg-red-950/40 border border-red-800/40 text-slate-200 text-xs sm:text-sm leading-relaxed">
            <div className="font-semibold text-red-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Recommended Action for Field Officers:
            </div>
            Prolonged rainfall has elevated slope saturation beyond safety threshold. Avoid roadside cut-slopes, maintain distance from retaining embankments, and notify District Disaster Management Authority (DDMA).
          </div>

          {/* REAL CARRIER SMS DISPATCH SECTION */}
          <div className="rounded-2xl p-4 bg-slate-900/90 border border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Carrier SMS Alert Delivery
                </span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {smsStatus?.configured ? "Twilio: Configured" : "Twilio: Unconfigured"}
              </span>
            </div>

            {isPhoneVerified ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div>
                    <span>Recipient: </span>
                    <strong className="text-white font-mono">{user.phoneE164}</strong>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      hasSmsConsent
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {hasSmsConsent ? "SMS Opt-in: Active" : "SMS Opt-in: Disabled"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDispatchSms(false)}
                  disabled={smsSending}
                  data-testid="dispatch-emergency-sms-btn"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold shadow-md shadow-red-600/25 transition-all disabled:opacity-60 cursor-pointer"
                >
                  <Send className={`h-3.5 w-3.5 ${smsSending ? "animate-spin" : ""}`} />
                  {smsSending ? "Connecting to Carrier..." : `Send Emergency SMS to ${user.maskedPhone}`}
                </button>

                {/* SMS Response Status Badge */}
                {smsResult && (
                  <div
                    className={`text-xs p-3 rounded-xl border leading-relaxed ${
                      smsResult.success
                        ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                        : smsResult.code === "COOLDOWN_ACTIVE"
                        ? "bg-blue-950/40 border-blue-800/60 text-blue-300"
                        : "bg-amber-950/40 border-amber-800/60 text-amber-300"
                    }`}
                    data-testid="sms-delivery-status"
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className="flex items-center gap-1.5">
                        {smsResult.success ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-400" />
                        )}
                        Status: {smsResult.status || smsResult.code || "Result"}
                      </span>
                      {smsResult.provider && (
                        <span className="text-[10px] text-slate-400">Provider: {smsResult.provider}</span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-90">{smsResult.message || smsResult.error}</p>
                    {smsResult.sid && (
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Twilio Message SID: {smsResult.sid}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <span>
                  Currently in demo session. Verify your mobile phone to receive real SMS alerts.
                </span>
                <button
                  onClick={() => {
                    onClose();
                    navigate("/login");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs whitespace-nowrap cursor-pointer transition"
                >
                  Verify Phone
                </button>
              </div>
            )}
          </div>

          {/* Direct Physical Device Delivery Options (USB & Instant Push) */}
          <div className="rounded-2xl p-3.5 bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Direct Device Delivery:</span>
              <span className="text-[10px] text-blue-400">Wi-Fi IP: 10.60.203.188:3000</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* USB Cable ADB Alert */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const r = await fetch(`${API_BASE}/alerts/usb-push`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        alertData: { name: locName, riskLevel, riskScore }
                      })
                    });
                    const d = await r.json();
                    if (d.success) {
                      toast.success(d.message || "Alert dispatched to USB phone!");
                    } else {
                      toast.warning(d.error || "Connect phone via USB and enable USB Debugging.");
                    }
                  } catch (e) {
                    toast.error("Failed to connect to local USB bridge.");
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                title="Send notification over USB cable (Android ADB)"
              >
                <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                <span>USB Cable Alert</span>
              </button>

              {/* Instant Lock-screen Push (ntfy.sh) */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const r = await fetch(`${API_BASE}/alerts/instant-push`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        alertData: { name: locName, state: stateName, riskLevel, riskScore }
                      })
                    });
                    const d = await r.json();
                    if (d.success) {
                      toast.success("Emergency push broadcasted! Open ntfy.sh/signalmesh-hazard-alert on phone.");
                      window.open("https://ntfy.sh/signalmesh-hazard-alert", "_blank");
                    } else {
                      toast.error("Failed to broadcast instant push.");
                    }
                  } catch (e) {
                    toast.error("Network error on instant push.");
                  }
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                title="Broadcast instant push notification via ntfy.sh"
              >
                <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>Instant Push</span>
              </button>

              {/* WhatsApp Direct Dispatch */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `🚨 [EMERGENCY ALERT] SignalMesh AI: ${riskLevel.toUpperCase()} LANDSLIDE RISK detected in ${locName}, ${stateName}. Score ${riskScore}/100. High soil saturation & steep slope. Take immediate precautions! http://10.60.203.188:3000/alerts`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold transition cursor-pointer"
                title="Send warning directly to your WhatsApp"
              >
                <Share2 className="h-3.5 w-3.5 text-white" />
                <span>WhatsApp Alert</span>
              </a>
            </div>
          </div>

          {/* Browser Push & Vibration Status */}
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-300">
              <Smartphone className="h-4 w-4 text-blue-400" />
              <span>Browser Notification &amp; Vibration:</span>
            </div>
            <button
              onClick={triggerNativeDeviceNotification}
              className="text-blue-400 hover:text-blue-300 font-semibold underline flex items-center gap-1 cursor-pointer"
            >
              {notifSent ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Re-test Browser Alert</span>
                </>
              ) : (
                "Test Browser Alert"
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleViewMap}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <Navigation className="h-4 w-4" />
              Locate on Map
            </button>

            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              Share Warning (App / SMS)
            </button>
          </div>

          {/* Simulated Hazard Disclaimer */}
          <div className="text-center text-[10px] text-slate-500 italic">
            * Simulated Hazard Notice: Demonstration risk metrics are simulated for evaluation purposes.
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 text-center text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Acknowledge &amp; Dismiss Emergency Broadcast
          </button>
        </div>
      </div>
    </div>
  );
}
