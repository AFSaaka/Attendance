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

function App() {
  const [view, setView] = useState("login");
  const { location, resetLocation, refreshGPS } = useGeolocation();
  const [isLocked, setIsLocked] = useState(false);

  // Initialize user directly from localStorage to prevent the "Auth Flicker"
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("uds_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Start as true if we have a saved user to prevent "Dashboard Leak"
  const [isCheckingAuth, setIsCheckingAuth] = useState(!!user);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    document.title = "TTFPP | Login";
  }, []);

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
      // If no user, we aren't checking anything
      if (!user) {
        setIsCheckingAuth(false);
        return;
      }

      // If offline, we trust the local session (your specific requirement)
      if (isOffline) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        await axios.get("auth/verify");
        // If successful, we stay logged in
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
  }, [isOffline, user, handleLogout]); // Re-verify if we come back online
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

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    uin: "",
    indexNumber: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  // --- Message Timer ---
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
      // Generate a simple unique ID (Timestamp + Random string)
      deviceId = "dev_" + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem("student_device_id", deviceId);
    }
    return deviceId;
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

    checkLock(); // Check immediately
    const interval = setInterval(checkLock, 10000); // Re-check every 10 seconds
    return () => clearInterval(interval);
  }, []);
  const handleAction = async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const endpoint = view === "login" ? "auth/login" : "auth/register";
      const payload = {
        ...formData,
        device_id: getDeviceId(), // Injected from our new helper
      };

      const response = await axios.post(endpoint, payload);

      if (response.data.status === "success") {
        if (view === "login") {
          localStorage.removeItem("uds_login_lock");
          const userData = response.data.user;
          setUser(userData);
          localStorage.setItem("uds_user", JSON.stringify(userData));

          if (userData.must_reset_password) {
            navigate("/reset-password");
          }
        } else {
          setMessage({ type: "success", text: response.data.message });
          setTimeout(() => setView("verify"), 1000);
        }
      }
    } catch (error) {
      console.error("Login Error:", error.response);
      const status = error.response?.status;
      const data = error.response?.data;

      // 1. OFFLINE FALLBACK
      if (!navigator.onLine && view === "login") {
        const savedUser = JSON.parse(localStorage.getItem("uds_user"));
        if (savedUser && savedUser.email === formData.email) {
          setUser(savedUser);
          setMessage({ type: "success", text: "Offline login successful." });
          return;
        }
      }

      // 2. RATE LIMITING (429 - 5+ attempts)
      if (status === 429) {
        // Calculate the time 15 minutes from now
        const lockUntil = Date.now() + 15 * 60 * 1000;
        localStorage.setItem("uds_login_lock", lockUntil.toString());

        setIsLocked(true);
        setMessage({
          type: "error",
          text: "🔒 Too many attempts. Button disabled for 15 minutes.",
        });
        return;
      }

      // 3. EMAIL VERIFICATION (403 + flag)
      if (status === 403 && data?.requires_verification) {
        setMessage({ type: "error", text: data.message });
        setFormData((prev) => ({ ...prev, email: data.email || prev.email }));
        setTimeout(() => setView("verify"), 2000);
        return;
      }

      // 4. DEVICE LOCK / ACCESS DENIED (General 403)
      if (status === 403) {
        setMessage({
          type: "error",
          text: `🚫 Access Denied: ${data?.message || "Device not recognized."}`,
        });
        return;
      }

      // 5. GENERAL ERRORS (401, 500, etc.)
      setMessage({ type: "error", text: data?.message || "Action failed." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode) => {
    setIsLoading(true);
    try {
      const response = await axios.post("auth/verify_otp", {
        email: formData.email,
        otp: otpCode,
      });
      return response.data.status === "success";
    } catch (error) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) return <FullScreenLoader />;

  return (
    <div style={styles.wrapperStyle}>
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
                      onResend={() => {}}
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
                        </>
                      )}

                      <PrimaryButton
                        type="submit"
                        isLoading={isLoading}
                        disabled={
                          isLocked || // New check
                          (view === "login"
                            ? !(formData.email && formData.password)
                            : false)
                        }
                      >
                        {isLocked
                          ? "Account Locked"
                          : view === "login"
                            ? "Login"
                            : "Create Account"}
                      </PrimaryButton>

                      <p style={{ marginTop: "20px", fontSize: "13px" }}>
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
                {/* IMPORTANT: AdminShell is the one that contains the 
                   modals and state-based visibility.
                */}
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
