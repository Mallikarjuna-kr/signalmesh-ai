import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Lock, Eye, EyeOff, Smartphone, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Login() {
  const { login, sendPhoneOtp, verifyPhoneOtp } = useApp();
  const navigate = useNavigate();

  // Tab: 'phone' or 'demo'
  const [activeTab, setActiveTab] = useState("phone");

  // Phone OTP Flow states
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Demo Login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [demoError, setDemoError] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Request OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setPhoneError("");
    setPhoneLoading(true);

    const res = await sendPhoneOtp(phone);
    setPhoneLoading(false);

    if (res.success) {
      setOtpSent(true);
      setMaskedPhone(res.maskedPhone || phone);
      setCooldown(res.cooldownSeconds || 60);
      toast.success(res.message || "Verification code sent to your phone!");
    } else {
      setPhoneError(res.error || "Failed to send verification code.");
      if (res.retryAfterSeconds) {
        setCooldown(res.retryAfterSeconds);
      }
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 4) {
      setPhoneError("Please enter the 6-digit verification code sent to your phone.");
      return;
    }
    setPhoneError("");
    setPhoneLoading(true);

    const res = await verifyPhoneOtp(phone, otp.trim());
    setPhoneLoading(false);

    if (res.success) {
      toast.success("Phone verified! Welcome to SignalMesh AI.");
      navigate("/dashboard");
    } else {
      setPhoneError(res.error || "Invalid verification code.");
    }
  };

  // Submit Demo Login
  const submitDemo = (e) => {
    e.preventDefault();
    setDemoError("");
    setDemoLoading(true);
    setTimeout(() => {
      const res = login(username, password);
      setDemoLoading(false);
      if (res.ok) navigate("/dashboard");
      else setDemoError(res.error);
    }, 500);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4">
      <img src="/login-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#0a1020]/25" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1020]/45 via-transparent to-[#0a1020]/60" />

      {/* corner captions */}
      <div className="absolute top-6 left-6 text-slate-200/80 text-xs sm:text-sm border-l-2 border-amber-400/70 pl-3 leading-relaxed hidden sm:block">
        Monitor<br />Predict<br />Prevent<br /><span className="text-slate-400">For a Safer Northeast</span>
      </div>
      <div className="absolute top-6 right-6 text-right text-slate-200/80 text-xs sm:text-sm border-r-2 border-amber-400/70 pr-3 hidden sm:block">
        Safer Communities<br /><span className="text-slate-400">Stronger Tomorrow</span>
      </div>
      <div className="absolute bottom-6 right-6 text-right text-slate-300/80 text-xs border-r-2 border-amber-400/70 pr-3 hidden sm:block">
        A Safer Tomorrow<br /><span className="text-slate-400">Through Smarter Monitoring</span>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <img src="/signalmesh-logo.svg" alt="SignalMesh AI" className="w-full max-w-[250px] drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]" />
        <div className="text-slate-200 text-sm mb-6 -mt-1 font-medium">Landslide Risk Monitoring System</div>

        <div className="w-full bg-white rounded-2xl shadow-2xl p-7 sm:p-8" data-testid="login-card">
          {/* Tab selector */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("phone")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "phone"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              data-testid="login-tab-phone"
            >
              <Smartphone className="h-4 w-4 text-blue-600" />
              Phone Number (SMS)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("demo")}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "demo"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              data-testid="login-tab-demo"
            >
              <User className="h-4 w-4 text-slate-600" />
              Demo Access
            </button>
          </div>

          {/* TAB 1: PHONE NUMBER & OTP FLOW */}
          {activeTab === "phone" && (
            <div>
              <h2 className="font-display text-2xl font-extrabold text-slate-900 text-center">
                {otpSent ? "Verify Mobile Number" : "Mobile Phone Sign In"}
              </h2>
              <p className="text-slate-500 text-center text-xs sm:text-sm mt-1 mb-6">
                {otpSent
                  ? `Enter the 6-digit code dispatched to ${maskedPhone}`
                  : "Receive authentic early-warning landslide SMS alerts"}
              </p>

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Phone Number (with Country Code)
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-blue-500 transition">
                      <span className="text-xs font-bold text-slate-500 px-1 border-r border-slate-300 pr-2">
                        IND +91
                      </span>
                      <input
                        type="tel"
                        data-testid="login-phone-input"
                        className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-sm"
                        placeholder="e.g. 9876543210 or +919876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1.5">
                      Accepts Indian domestic 10 digits or international E.164.
                    </div>
                  </div>

                  {phoneError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3" data-testid="login-phone-error">
                      {phoneError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={phoneLoading || cooldown > 0}
                    data-testid="login-send-otp-btn"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0e1e3a] hover:bg-[#132a52] text-white font-semibold py-3.5 transition-colors disabled:opacity-60 cursor-pointer shadow-md text-sm"
                  >
                    {phoneLoading ? (
                      <span>Sending Verification Code...</span>
                    ) : cooldown > 0 ? (
                      <span>Resend code in {cooldown}s</span>
                    ) : (
                      <>
                        <span>Send Verification Code</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center text-[11px] text-slate-500 leading-relaxed">
                    By verifying, you consent to receive emergency landslide alerts and verification SMS from SignalMesh AI.
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 transition">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                      <input
                        type="text"
                        maxLength={6}
                        data-testid="login-otp-input"
                        className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 font-mono tracking-widest text-lg font-bold"
                        placeholder="••••••"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        autoFocus
                      />
                    </div>
                  </div>

                  {phoneError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3" data-testid="login-otp-error">
                      {phoneError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={phoneLoading || otp.length < 4}
                    data-testid="login-verify-otp-btn"
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 transition-colors disabled:opacity-60 cursor-pointer shadow-md text-sm"
                  >
                    {phoneLoading ? "Verifying..." : "Verify & Sign In"}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      disabled={cooldown > 0 || phoneLoading}
                      onClick={handleSendOtp}
                      className="text-blue-600 font-semibold hover:underline flex items-center gap-1 disabled:text-slate-400 disabled:no-underline"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${cooldown > 0 ? "animate-spin" : ""}`} />
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        setPhoneError("");
                      }}
                      className="text-slate-500 hover:text-slate-800 underline"
                    >
                      Change Phone Number
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: DEMO ACCESS */}
          {activeTab === "demo" && (
            <form onSubmit={submitDemo}>
              <h2 className="font-display text-2xl font-extrabold text-slate-900 text-center">Evaluator Access</h2>
              <p className="text-slate-500 text-center text-xs mb-6 mt-1">Preset Command Officer credential login</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 transition">
                  <User className="h-5 w-5 text-slate-400" />
                  <input
                    data-testid="login-username-input"
                    className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-sm"
                    placeholder="Username (admin)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 transition">
                  <Lock className="h-5 w-5 text-slate-400" />
                  <input
                    data-testid="login-password-input"
                    type={show ? "text" : "password"}
                    className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-sm"
                    placeholder="Password (admin123)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} className="text-slate-400 hover:text-slate-700" data-testid="login-toggle-password">
                    {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {demoError && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" data-testid="login-error">
                  {demoError}
                </div>
              )}

              <button
                type="submit"
                disabled={demoLoading}
                data-testid="login-submit-button"
                className="mt-5 w-full rounded-xl bg-[#0e1e3a] hover:bg-[#132a52] text-white font-semibold py-3.5 transition-colors disabled:opacity-70 text-sm cursor-pointer"
              >
                {demoLoading ? "Signing in..." : "Login with Demo Credentials"}
              </button>

              <p className="mt-4 text-center text-xs text-slate-400">Demo preset: admin / admin123</p>
            </form>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-5 text-slate-300/80 text-xs">
            <span>People</span><span className="text-slate-500">|</span>
            <span>Environment</span><span className="text-slate-500">|</span>
            <span>Resilient Northeast</span>
          </div>
          <div className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase">
            Team: APEX-AI-X
          </div>
        </div>
      </div>
    </div>
  );
}
