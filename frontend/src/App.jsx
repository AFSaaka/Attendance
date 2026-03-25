import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import axios, { setCsrfToken, isCancel } from "./api/axios";
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
const getSecureHash = async (email, password) => {
  const msgUint8 = new TextEncoder().encode(
    `${email.toLowerCase()}:${password}`,
  );
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
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

  // --- Updated Title Logic ---
  useEffect(() => {
    const titles = {
      login: "TTFPP | Login",
      signup: "TTFPP | Registration",
      verify: "TTFPP | Verification",
    };

    if (!user) {
      // If no user, use the 'view' state to determine title
      document.title = titles[view] || "TTFPP | Portal";
    } else {
      // If user exists, use their role for the title
      const roleTitles = {
        admin: "TTFPP | Admin Dashboard",
        student: "TTFPP | Student Portal",
        coordinator: "TTFPP | Coordinator Dashboard",
      };
      document.title = roleTitles[user.role] || "TTFPP | Portal";
    }
  }, [view, user]); // Added 'user' as a dependency

  const handleLogout = useCallback(() => {
    // 1. Clear ALL session data
    localStorage.removeItem("uds_user");
    localStorage.removeItem("uds_vault"); // CRITICAL: Prevents next user from hijacking offline session

    // 2. Clear CSRF token (set to null)
    setCsrfToken(null);

    // 3. Update State
    setUser(null);
    setView("login");

    // 4. Reset title manually for immediate feedback
    document.title = "TTFPP | Login";

    // 5. Redirect and cleanup
    resetLocation();
    navigate("/", { replace: true });
  }, [navigate, resetLocation]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const verifySession = async () => {
      if (!user || !navigator.onLine) {
        setIsCheckingAuth(false);
        return;
      }
      try {
        const response = await axios.get("auth/verify", {
          signal: controller.signal,
        });
        // Capture CSRF token from verify response for subsequent requests
        if (response.data?.csrf_token) {
          setCsrfToken(response.data.csrf_token);
        }
      } catch (error) {
        if (isCancel(error)) return;
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
      controller.abort();
      isMounted = false;
    };
  }, [user, handleLogout]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      // Refresh CSRF token when coming back online
      // This ensures sync can proceed immediately with a valid token
      try {
        const res = await axios.get("auth/csrf");
        if (res.data?.csrf_token) {
          setCsrfToken(res.data.csrf_token);
        }
      } catch {
        // Silently ignore — verifySession will handle token refresh
      }
    };
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
    // --- 1. SIGNUP VALIDATION ---
    if (view === "signup") {
      // Explicitly check navigator.onLine as a backup to the isOffline state
      if (isOffline || !navigator.onLine) {
        setMessage({
          type: "error",
          text: "Account registration requires an active internet connection.",
        });
        return;
      }
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

    // --- 2. INITIALIZE LOADING STATE ---
    setProcessingMessage(
      view === "login" ? "Signing in..." : "Creating your account...",
    );
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    const startTime = Date.now();

    // --- 3. PRE-EMPTIVE OFFLINE LOGIN BRANCH ---
    // This handles cases where we KNOW we are offline before trying the network
    if (view === "login" && (isOffline || !navigator.onLine)) {
      const cachedVault = localStorage.getItem("uds_vault");
      const cachedUser = localStorage.getItem("uds_user");

      if (cachedVault && cachedUser) {
        const inputHash = await getSecureHash(
          formData.email,
          formData.password,
        );
        if (inputHash === cachedVault) {
          setTimeout(() => {
            setUser(JSON.parse(cachedUser));
            setProcessingMessage(null);
            setIsLoading(false);
          }, 1500);
          return;
        }
      }
    }

    // --- 4. ONLINE ACTION BRANCH ---
    try {
      const endpoint = view === "login" ? "auth/login" : "auth/register";
      const payload = { ...formData, device_id: getDeviceId() };

      const response = await axios.post(endpoint, payload);

      const duration = Date.now() - startTime;
      const waitTime = Math.max(0, 1500 - duration);

      setTimeout(async () => {
        if (response.data.status === "success") {
          if (view === "login") {
            localStorage.removeItem("uds_login_lock");
            const userData = response.data.user;

            // SECURE VAULT UPDATE
            localStorage.setItem("uds_user", JSON.stringify(userData));
            const loginHash = await getSecureHash(
              formData.email,
              formData.password,
            );
            localStorage.setItem("uds_vault", loginHash);

            // CSRF Token: Capture from login response if available
            // (Will be confirmed/refreshed on first auth/verify call)
            if (response.data.csrf_token) {
              setCsrfToken(response.data.csrf_token);
            }

            setUser(userData);
            setProcessingMessage(null);
            setIsLoading(false);
            if (userData.must_reset_password) navigate("/reset-password");
          } else {
            setProcessingMessage(null);
            setIsLoading(false);
            setMessage({ type: "success", text: response.data.message });
            setFormData((prev) => ({
              ...prev,
              password: "",
              confirmPassword: "",
            }));
            setView("verify");
          }
        }
      }, waitTime);
    } catch (error) {
      // 1. Check if this is a connection failure (no response from server)
      const isNetworkError = !error.response;

      if (view === "login" && isNetworkError) {
        console.log("Network unreachable. Checking local vault...");

        const cachedVault = localStorage.getItem("uds_vault");
        const cachedUser = localStorage.getItem("uds_user");

        if (cachedVault && cachedUser) {
          const inputHash = await getSecureHash(
            formData.email,
            formData.password,
          );

          if (inputHash === cachedVault) {
            // MATCH FOUND: Log them in and EXIT the function
            setTimeout(() => {
              const userData = JSON.parse(cachedUser);
              setUser(userData);
              setProcessingMessage(null);
              setIsLoading(false);
            }, 1500);
            return; // <--- CRITICAL: Stop here so we don't show the error message
          } else {
            // CREDENTIALS DON'T MATCH VAULT
            setMessage({ type: "error", text: "Invalid offline credentials." });
          }
        } else {
          // NO VAULT FOUND
          setMessage({
            type: "error",
            text: "No saved session found. Please connect to the internet.",
          });
        }

        // Cleanup and Exit
        setProcessingMessage(null);
        setIsLoading(false);
        return;
      }

      // 2. Standard Server Errors (e.g., 401 Unauthorized, 403 Forbidden)
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
        setMessage({
          type: "error",
          text:
            data?.message || "Action failed. Check your internet connection.",
        });
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
      <Toaster position="top-right" richColors />
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
                    style={{
                      width: "60px",
                      marginBottom: "10px",
                      display: "block",
                      margin: "0 auto 10px",
                    }}
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
                      <h2 style={{ margin: "0 0 5px 0" }}>
                        University for Development Studies
                      </h2>
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
