import React, { useState, useEffect } from "react"; // FIX 1: Added useEffect here
import axios from "./api/axios";
import udsLogo from "./assets/udslogo.ico";
import InputField from "./components/inputField";
import PrimaryButton from "./components/primaryButton";
import StudentDashboard from "./components/studentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import CoordinatorDashboard from "./components/CoordinatorDashboard";
import OtpInput from "./components/OtpInput";

function App() {
  const [view, setView] = useState("login");
  const [user, setUser] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    uin: "",
    indexNumber: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });

  // Recovery logic: Runs once when the app starts
  useEffect(() => {
    const savedUser = localStorage.getItem("uds_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Timer logic: Clears messages after 5 seconds
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

  const isLoginValid = formData.email && formData.password;
  const isSignupValid =
    formData.uin &&
    formData.indexNumber &&
    formData.email &&
    formData.password &&
    formData.password === formData.confirmPassword;

  const handleViewChange = (newView) => {
    setMessage({ type: "", text: "" });
    setView(newView);
  };

  const handleAction = async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const endpoint = view === "login" ? "auth/login" : "auth/register";
      const response = await axios.post(endpoint, formData);

      if (response.data.status === "success") {
        if (view === "login") {
          setUser(response.data.user);
          localStorage.setItem("uds_user", JSON.stringify(response.data.user));
        } else {
          // Registration success: move to verify view
          setMessage({ type: "success", text: response.data.message });
          setTimeout(() => setView("verify"), 1000);
        }
      }
    } catch (error) {
      const data = error.response?.data;

      // FIX: If login fails because of verification (403 status)
      if (error.response?.status === 403 && data?.requires_verification) {
        setMessage({ type: "error", text: data.message });

        // Update email in formData just in case, then redirect to OTP
        setFormData((prev) => ({ ...prev, email: data.email || prev.email }));

        // Delay briefly so they can read the error message before the screen switches
        setTimeout(() => setView("verify"), 2000);
        return;
      }

      // Standard error handling
      const errorMsg =
        data?.message || "Action failed. Please check your connection.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("uds_user");
    setUser(null);
    setView("login");
  };

  const handleResendOtp = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await axios.post("auth/resend_otp", {
        email: formData.email,
      });
      setMessage({ type: "success", text: response.data.message });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Could not resend code.",
      });
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const isValid = view === "login" ? isLoginValid : isSignupValid;
    if (isValid && !isLoading) handleAction();
  };

  // Styles
  const wrapperStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100vw",
    minHeight: "100vh",
    backgroundColor: "#f0f2f5",
  };
  const cardStyle = {
    width: "90%",
    maxWidth: "340px",
    backgroundColor: "#fff",
    padding: "30px 25px",
    borderRadius: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    textAlign: "center",
  };

  return (
    <div style={wrapperStyle}>
      {user ? (
        <>
          {user.role === "admin" && (
            <AdminDashboard user={user} onLogout={handleLogout} />
          )}
          {user.role === "coordinator" && (
            <CoordinatorDashboard user={user} onLogout={handleLogout} />
          )}
          {user.role === "student" && (
            <StudentDashboard user={user} onLogout={handleLogout} />
          )}
        </>
      ) : (
        <div style={cardStyle}>
          <img
            src={udsLogo}
            alt="UDS"
            style={{ width: "60px", marginBottom: "10px" }}
          />

          {message.text && (
            <div
              style={{
                padding: "10px",
                marginBottom: "15px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "500",
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
              onResend={handleResendOtp}
              onContinue={() => {
                setMessage({
                  type: "success",
                  text: "Verified! Please login with your password.",
                });
                setView("login");
              }}
            />
          ) : (
            <form onSubmit={handleFormSubmit}>
              {view === "login" ? (
                <>
                  <h2 style={{ margin: "0 0 5px 0" }}>UDS</h2>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#777",
                      marginBottom: "20px",
                    }}
                  >
                    TTFPP Portal
                  </p>
                  <InputField
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    isFocused={focusedField === "email"}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <InputField
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    isFocused={focusedField === "password"}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <PrimaryButton
                    type="submit"
                    disabled={!isLoginValid}
                    isLoading={isLoading}
                  >
                    Login
                  </PrimaryButton>
                  <p style={{ marginTop: "20px", fontSize: "13px" }}>
                    New student?{" "}
                    <span
                      onClick={() => handleViewChange("signup")}
                      style={{
                        color: "#0c0481",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Claim Account
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ margin: "0 0 5px 0" }}>Account</h2>
                  {["uin", "indexNumber", "email"].map((f) => (
                    <InputField
                      key={f}
                      name={f}
                      placeholder={
                        f === "uin"
                          ? "UIN"
                          : f === "indexNumber"
                          ? "INDEX NUMBER"
                          : "EMAIL ADDRESS"
                      }
                      value={formData[f]}
                      onChange={handleChange}
                      isFocused={focusedField === f}
                      onFocus={() => setFocusedField(f)}
                      onBlur={() => setFocusedField(null)}
                    />
                  ))}
                  <InputField
                    name="password"
                    type="password"
                    placeholder="Create Password"
                    value={formData.password}
                    onChange={handleChange}
                    isFocused={focusedField === "password"}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <InputField
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    isFocused={focusedField === "confirmPassword"}
                    onFocus={() => setFocusedField("confirmPassword")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <PrimaryButton
                    type="submit"
                    disabled={!isSignupValid}
                    isLoading={isLoading}
                  >
                    Create Account
                  </PrimaryButton>
                  <p style={{ marginTop: "20px", fontSize: "13px" }}>
                    Already registered?{" "}
                    <span
                      onClick={() => handleViewChange("login")}
                      style={{
                        color: "#045204",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Login here
                    </span>
                  </p>
                </>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
