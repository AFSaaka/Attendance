import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "./api/axios";
import udsLogo from "./assets/udslogo.ico";
import InputField from "./components/inputField";
import PrimaryButton from "./components/primaryButton";
import StudentDashboard from "./components/studentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import ResetPassword from "./components/ResetPassword";
import OtpInput from "./components/OtpInput";
import FullScreenLoader from "./components/FullScreenLoader";
import { useGeolocation } from "./hooks/useGeolocation";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { location, resetLocation, refreshGPS } = useGeolocation();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    uin: "",
    indexNumber: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  // --- Session Recovery ---
  useEffect(() => {
    const recoverSession = async () => {
      try {
        const savedUser = localStorage.getItem("uds_user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error("Session recovery failed");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    recoverSession();
  }, []);

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

  const handleAction = async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const endpoint = view === "login" ? "auth/login" : "auth/register";
      const response = await axios.post(endpoint, formData);

      if (response.data.status === "success") {
        if (view === "login") {
          const userData = response.data.user;
          setUser(userData);
          localStorage.setItem("uds_user", JSON.stringify(userData));

          // If the admin must reset password, navigate them immediately
          if (userData.must_reset_password) {
            navigate("/reset-password");
          }
        } else {
          setMessage({ type: "success", text: response.data.message });
          setTimeout(() => setView("verify"), 1000);
        }
      }
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 403 && data?.requires_verification) {
        setMessage({ type: "error", text: data.message });
        setFormData((prev) => ({ ...prev, email: data.email || prev.email }));
        setTimeout(() => setView("verify"), 2000);
        return;
      }
      setMessage({ type: "error", text: data?.message || "Action failed." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("uds_user");
    setUser(null);
    setView("login");
    resetLocation();
    navigate("/");
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

  // --- Updated Protected Route Logic ---
  const AuthGuard = ({ children, allowedRole }) => {
    if (!user) return <Navigate to="/" replace />;

    // FORCED RESET TRAP: Block dashboard access if reset is required
    if (user.must_reset_password) {
      return <Navigate to="/reset-password" replace />;
    }

    if (allowedRole && user.role !== allowedRole)
      return <Navigate to="/" replace />;

    return children;
  };

  return (
    <div style={styles.wrapperStyle}>
      <ErrorBoundary>
        <Routes>
          {/* 1. PUBLIC AUTH ROUTE */}
          <Route
            path="/"
            element={
              user ? (
                // Logic to redirect already logged-in users
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
                        border: `1px solid ${
                          message.type === "error" ? "#ffa39e" : "#b7eb8f"
                        }`,
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
                          view === "login"
                            ? !(formData.email && formData.password)
                            : false
                        }
                      >
                        {view === "login" ? "Login" : "Create Account"}
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

          {/* 2. PASSWORD RESET ROUTE (Standalone) */}
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

          {/* 3. PROTECTED DASHBOARD ROUTES */}
          <Route
            path="/admin/*"
            element={
              <AuthGuard allowedRole="admin">
                <AdminDashboard user={user} onLogout={handleLogout} />
              </AuthGuard>
            }
          />

          <Route
            path="/student"
            element={
              <AuthGuard allowedRole="student">
                <StudentDashboard
                  user={user}
                  location={location}
                  onLogout={handleLogout}
                  onRefreshGPS={refreshGPS}
                />
              </AuthGuard>
            }
          />

          {/* 4. CATCH-ALL REDIRECT */}
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
    minHeight: "100vh",
    backgroundColor: "#f0f2f5",
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
