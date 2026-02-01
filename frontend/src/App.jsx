import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "./api/axios";
import udsLogo from "./assets/udslogo.ico";
import InputField from "./components/inputField";
import PrimaryButton from "./components/primaryButton";
import StudentDashboard from "./components/studentDashboard";
import AdminShell from "./components/AdminDashboard";
import ResetPassword from "./components/ResetPassword";
import OtpInput from "./components/OtpInput";
import FullScreenLoader from "./components/FullScreenLoader";
import { useGeolocation } from "./hooks/useGeolocation";
import ErrorBoundary from "./components/ErrorBoundary";

// --- AuthGuard optimized with useMemo to prevent re-renders ---
const AuthGuard = ({ children, user, allowedRole }) => {
  if (!user) return <Navigate to="/" replace />;
  if (user.must_reset_password)
    return <Navigate to="/reset-password" replace />;
  if (allowedRole && user.role !== allowedRole)
    return <Navigate to="/" replace />;
  return children;
};

const ProcessingOverlay = ({ message }) => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      backdropFilter: "blur(4px)",
    }}
  >
    <div
      className="spinner"
      style={{
        border: "4px solid #f3f3f3",
        borderTop: "4px solid #198104",
        borderRight: "4px solid #FFD700",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        animation: "spin 1s linear infinite",
      }}
    />
    <p style={{ marginTop: "15px", fontWeight: "bold", color: "#333" }}>
      {message}
    </p>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

function App() {
  const [view, setView] = useState("login");
  const { location, resetLocation, refreshGPS } = useGeolocation();
  const [isLocked, setIsLocked] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(null);

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("uds_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [isCheckingAuth, setIsCheckingAuth] = useState(!!user);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    uin: "",
    indexNumber: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  // --- NEW: SIGNUP VALIDATION LOGIC ---
  const isSignupValid = useMemo(() => {
    return (
      formData.uin?.trim() !== "" &&
      formData.indexNumber?.trim() !== "" &&
      formData.email?.trim() !== "" &&
      formData.password?.length >= 6 &&
      formData.password === formData.confirmPassword
    );
  }, [formData]);

  useEffect(() => {
    const titles = {
      login: "TTFPP | Login",
      signup: "TTFPP | Registration",
      verify: "TTFPP | Verification",
    };
    document.title = titles[view] || "TTFPP | Portal";
  }, [view]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("uds_user");
    setUser(null);
    setView("login");
    resetLocation();
    navigate("/", { replace: true });
  }, [navigate, resetLocation]);

  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      if (!user || isOffline) {
        setIsCheckingAuth(false);
        return;
      }
      try {
        await axios.get("auth/verify");
      } catch (error) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          handleLogout();
        }
      } finally {
        if (isMounted) setIsCheckingAuth(false);
      }
    };
    verifySession();
    return () => {
      isMounted = false;
    };
  }, [isOffline, user, handleLogout]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [message.text]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (message.text) setMessage({ type: "", text: "" });
  };

  const getDeviceId = () => {
    let deviceId = localStorage.getItem("student_device_id");
    if (!deviceId) {
      deviceId = "dev_" + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem("student_device_id", deviceId);
    }
    return deviceId;
  };

  const handleResendOtp = async () => {
    if (!formData.email) {
      setMessage({
        type: "error",
        text: "Email is missing. Please restart registration.",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post("auth/resend_otp", {
        email: formData.email,
      });
      if (response.data.status === "success") {
        setMessage({ type: "success", text: response.data.message });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to resend code.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkLock = () => {
      const lockTimestamp = localStorage.getItem("uds_login_lock");
      if (lockTimestamp) {
        if (Date.now() < parseInt(lockTimestamp)) {
          setIsLocked(true);
        } else {
          localStorage.removeItem("uds_login_lock");
          setIsLocked(false);
          setMessage({
            type: "success",
            text: "Lock expired. You can try again.",
          });
        }
      }
    };
    checkLock();
    const interval = setInterval(checkLock, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async () => {
    if (view === "signup") {
      if (!formData.password || !formData.confirmPassword) {
        setMessage({
          type: "error",
          text: "Please fill in all password fields.",
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setMessage({ type: "error", text: "Passwords do not match!" });
        return;
      }
      if (formData.password.length < 6) {
        setMessage({
          type: "error",
          text: "Password must be at least 6 characters.",
        });
        return;
      }
    }

    setProcessingMessage(
      view === "login" ? "Signing in..." : "Creating your account...",
    );
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    const startTime = Date.now();

    try {
      const endpoint = view === "login" ? "auth/login" : "auth/register";
      const payload = { ...formData, device_id: getDeviceId() };

      const response = await axios.post(endpoint, payload);

      const duration = Date.now() - startTime;
      const waitTime = Math.max(0, 3000 - duration);

      setTimeout(() => {
        setProcessingMessage(null);
        setIsLoading(false);

        if (response.data.status === "success") {
          if (view === "login") {
            localStorage.removeItem("uds_login_lock");
            const userData = response.data.user;
            setUser(userData);
            localStorage.setItem("uds_user", JSON.stringify(userData));
            if (userData.must_reset_password) navigate("/reset-password");
          } else {
            setMessage({ type: "success", text: response.data.message });
            setView("verify");
          }
        }
      }, waitTime);
    } catch (error) {
      setProcessingMessage(null);
      setIsLoading(false);
      const status = error.response?.status;
      const data = error.response?.data;

      if (
        (data?.message?.includes("already claimed") || status === 403) &&
        data?.requires_verification
      ) {
        setMessage({ type: "error", text: data.message });
        setView("verify");
      } else {
        setMessage({ type: "error", text: data?.message || "Action failed." });
      }
    }
  };

  const handleVerifyOtp = async (otpCode) => {
    setIsLoading(true);
    setProcessingMessage("Verifying code..."); // This triggers the overlay
    try {
      const response = await axios.post("auth/verify_otp", {
        email: formData.email,
        otp: otpCode,
      });

      // Artificial delay to ensure user sees the "Verifying" state
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (response.data.status === "success") {
        setFormData({
          email: "",
          password: "",
          uin: "",
          indexNumber: "",
          confirmPassword: "",
        });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
      setProcessingMessage(null); // This hides the overlay
    }
  };

  if (isCheckingAuth) return <FullScreenLoader />;

  return (
    <div style={styles.wrapperStyle}>
      {processingMessage && <ProcessingOverlay message={processingMessage} />}
      {isOffline && (
        <div style={styles.offlineBanner}>
          You are currently offline. Using saved session.
        </div>
      )}
      <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                user.must_reset_password ? (
                  <Navigate to="/reset-password" replace />
                ) : user.role === "admin" ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/student" replace />
                )
              ) : (
                <div style={styles.cardStyle}>
                  <img
                    src={udsLogo}
                    alt="UDS"
                    style={{ width: "60px", marginBottom: "10px" }}
                  />
                  {message.text && (
                    <div
                      style={{
                        ...styles.alertBox,
                        backgroundColor:
                          message.type === "error" ? "#fff1f0" : "#f6ffed",
                        color: message.type === "error" ? "#cf1322" : "#389e0d",
                        border: `1px solid ${message.type === "error" ? "#ffa39e" : "#b7eb8f"}`,
                      }}
                    >
                      {message.text}
                    </div>
                  )}

                  {view === "verify" ? (
                    <OtpInput
                      email={formData.email}
                      onVerify={handleVerifyOtp}
                      isLoading={isLoading}
                      onResend={handleResendOtp}
                      onContinue={() => {
                        setMessage({
                          type: "success",
                          text: "Verified! Please login.",
                        });
                        setView("login");
                      }}
                    />
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAction();
                      }}
                    >
                      <h2 style={{ margin: "0 0 5px 0" }}>UDS</h2>
                      <p style={styles.subTitle}>TTFPP Portal</p>

                      {view === "login" ? (
                        <>
                          <InputField
                            name="email"
                            placeholder="Email Address"
                            value={formData.email}
                            onChange={handleChange}
                          />
                          <InputField
                            name="password"
                            type="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                          />
                        </>
                      ) : (
                        <>
                          {["uin", "indexNumber", "email"].map((f) => (
                            <InputField
                              key={f}
                              name={f}
                              placeholder={f.toUpperCase()}
                              value={formData[f]}
                              onChange={handleChange}
                            />
                          ))}
                          <InputField
                            name="password"
                            type="password"
                            placeholder="Create Password"
                            value={formData.password}
                            onChange={handleChange}
                          />
                          <InputField
                            name="confirmPassword"
                            type="password"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                          />
                          {/* Matching feedback */}
                          {formData.confirmPassword &&
                            formData.password !== formData.confirmPassword && (
                              <p
                                style={{
                                  color: "#cf1322",
                                  fontSize: "11px",
                                  textAlign: "left",
                                  margin: "-10px 0 10px 5px",
                                }}
                              >
                                * Passwords do not match
                              </p>
                            )}
                        </>
                      )}

                      <PrimaryButton
                        type="submit"
                        isLoading={isLoading}
                        disabled={
                          isLocked ||
                          (view === "login"
                            ? !(formData.email && formData.password)
                            : !isSignupValid)
                        }
                      >
                        {isLocked
                          ? "Account Locked"
                          : view === "login"
                            ? "Login"
                            : "Create Account"}
                      </PrimaryButton>

                      <p
                        style={{
                          marginTop: "20px",
                          fontSize: "13px",
                          color: "#2e2e2e",
                        }}
                      >
                        {view === "login"
                          ? "New student? "
                          : "Already registered? "}
                        <span
                          onClick={() =>
                            setView(view === "login" ? "signup" : "login")
                          }
                          style={styles.toggleLink}
                        >
                          {view === "login" ? "Claim Account" : "Login here"}
                        </span>
                      </p>
                    </form>
                  )}
                </div>
              )
            }
          />
          <Route
            path="/reset-password"
            element={
              user && user.must_reset_password ? (
                <ResetPassword />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/admin/*"
            element={
              <AuthGuard user={user} allowedRole="admin">
                <AdminShell user={user} onLogout={handleLogout} />
              </AuthGuard>
            }
          />
          <Route
            path="/student"
            element={
              <AuthGuard user={user} allowedRole="student">
                <StudentDashboard
                  user={user}
                  location={location}
                  onLogout={handleLogout}
                  onRefreshGPS={refreshGPS}
                />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

const styles = {
  wrapperStyle: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100vw",
    minHeight: "100dvh",
    backgroundColor: "#f0f2f5",
  },
  offlineBanner: {
    position: "absolute",
    top: 0,
    width: "100%",
    backgroundColor: "#ff4d4f",
    color: "white",
    textAlign: "center",
    fontSize: "12px",
    padding: "5px 0",
    zIndex: 1000,
  },
  cardStyle: {
    width: "90%",
    maxWidth: "340px",
    backgroundColor: "#fff",
    padding: "30px 25px",
    borderRadius: "15px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  subTitle: { fontSize: "14px", color: "#777", marginBottom: "20px" },
  alertBox: {
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "500",
  },
  toggleLink: { color: "#0c0481", cursor: "pointer", fontWeight: "600" },
};

export default App;
