import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { INITIAL_REPORTS } from "@/data/reports";
import { LOCATIONS, getLocation } from "@/data/locations";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const DEFAULT_LAYERS = {
  landslideRisk: true,
  rainfall: false,
  soilMoisture: false,
  slopeGradient: false,
  landCover: false,
  earthquake: false,
  roads: false,
  villages: true,
  infrastructure: false,
};

const DEFAULT_SETTINGS = {
  alertNotifications: true,
  emailNotifications: true,
  fieldReportNotifications: true,
  autoRefresh: true,
  darkMode: true,
  mobileDeviceAlerts: true,
};

export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem("signalmesh_token") || null);
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("signalmesh_user") || localStorage.getItem("jatayu_user");
    return raw ? JSON.parse(raw) : {
      name: "Field Officer",
      initial: "F",
      role: "Command Officer",
      username: "field_officer",
      phoneE164: "+919876543210",
      maskedPhone: "+91••••3210",
      verified: true,
      smsConsent: true
    };
  });
  const [reports, setReports] = useState(INITIAL_REPORTS);
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedLocationId, setSelectedLocationId] = useState("dima-hasao");
  const [reportCounter, setReportCounter] = useState(56);
  // Auto-trigger High Risk alert for Dima Hasao immediately so device receives it on page load with ZERO login
  const [emergencyAlert, setEmergencyAlert] = useState(() => {
    return getLocation("dima-hasao") || {
      name: "Dima Hasao",
      state: "Assam",
      riskLevel: "Very High",
      riskScore: 88,
      rainfall: 85,
      soilMoisture: 78,
      slopeGradient: 82
    };
  });
  const [smsStatus, setSmsStatus] = useState(null);

  // Sync user state with localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("signalmesh_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("signalmesh_user");
      localStorage.removeItem("jatayu_user");
    }
  }, [user]);

  // Sync token state with sessionStorage
  useEffect(() => {
    if (token) {
      sessionStorage.setItem("signalmesh_token", token);
    } else {
      sessionStorage.removeItem("signalmesh_token");
    }
  }, [token]);

  // Revalidate session on load if token present
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.user) {
            setUser((prev) => ({ ...prev, ...d.user }));
          } else {
            // Token expired or invalid
            setToken(null);
          }
        })
        .catch(() => {
          // Backend unreachable or offline
        });
    }

    // Check SMS provider configuration
    fetch(`${API_BASE}/alerts/sms-status`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.sms) setSmsStatus(d.sms);
      })
      .catch(() => {});
  }, [token]);

  // Phone number login / registration: Send OTP
  const sendPhoneOtp = async (phone) => {
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, error: "Network error connecting to SignalMesh backend (port 5000)." };
    }
  };

  // Phone number login / registration: Verify OTP
  const verifyPhoneOtp = async (phone, otp) => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
      });
      const data = await res.json();
      if (data.success && data.user && data.token) {
        setUser({
          ...data.user,
          initial: data.user.name ? data.user.name[0] : "P",
        });
        setToken(data.token);
      }
      return data;
    } catch (err) {
      return { success: false, error: "Network error verifying code." };
    }
  };

  // Subscribe / Opt-in to SMS alerts
  const subscribeSms = async () => {
    if (!token) return { success: false, error: "Authentication required." };
    try {
      const res = await fetch(`${API_BASE}/alerts/subscribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser((p) => ({ ...p, ...data.user }));
      }
      return data;
    } catch (err) {
      return { success: false, error: "Failed to update SMS preference." };
    }
  };

  // Unsubscribe / Opt-out of SMS alerts
  const unsubscribeSms = async () => {
    if (!token) return { success: false, error: "Authentication required." };
    try {
      const res = await fetch(`${API_BASE}/alerts/unsubscribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser((p) => ({ ...p, ...data.user }));
      }
      return data;
    } catch (err) {
      return { success: false, error: "Failed to update SMS preference." };
    }
  };

  // Dispatch emergency alert SMS to verified user phone
  const sendEmergencySms = async (alertData, force = false) => {
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/alerts/send-test`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          alertData,
          phone: user?.phoneE164,
          force
        })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, error: "Network error dispatching SMS alert." };
    }
  };

  // Legacy demo login (admin / admin123) preserved for evaluation
  const login = (username, password) => {
    if (username.trim().toLowerCase() === "admin" && password === "admin123") {
      setUser({
        name: "S. Sharma",
        initial: "S",
        role: "Command Officer",
        username: "admin",
        isDemoUser: true
      });
      return { ok: true };
    }
    return { ok: false, error: "Invalid credentials. Use admin / admin123." };
  };

  const logout = () => {
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    setUser(null);
    setToken(null);
  };

  const toggleLayer = (key) => setLayers((p) => ({ ...p, [key]: !p[key] }));
  const toggleSetting = (key) => setSettings((p) => ({ ...p, [key]: !p[key] }));

  const addReport = (report) => {
    const id = `MFR-2025-${String(reportCounter).padStart(4, "0")}`;
    setReportCounter((c) => c + 1);
    const full = { id, status: "Submitted", aiStatus: "Pending", confidence: 0, riskImpact: "—", ...report };
    setReports((p) => [full, ...p]);
    return full;
  };

  const updateReport = (id, patch) =>
    setReports((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const triggerDeviceAlert = (targetLoc) => {
    let loc = targetLoc;
    if (!loc) {
      loc = getLocation(selectedLocationId) || LOCATIONS.find((l) => l.riskLevel === "Very High") || LOCATIONS[0];
    }
    setEmergencyAlert(loc);
  };

  const dismissEmergencyAlert = () => setEmergencyAlert(null);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      sendPhoneOtp,
      verifyPhoneOtp,
      subscribeSms,
      unsubscribeSms,
      sendEmergencySms,
      smsStatus,
      reports,
      addReport,
      updateReport,
      layers,
      toggleLayer,
      settings,
      toggleSetting,
      selectedLocationId,
      setSelectedLocationId,
      emergencyAlert,
      triggerDeviceAlert,
      dismissEmergencyAlert,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, token, reports, layers, settings, selectedLocationId, emergencyAlert, smsStatus]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
