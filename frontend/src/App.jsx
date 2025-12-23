import React, { useState } from "react";
import axios from "axios";
import udsLogo from "./assets/udslogo.ico";
import InputField from "./components/inputField";
import PrimaryButton from "./components/primaryButton";
import StudentDashboard from "./components/studentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import CoordinatorDashboard from "./components/CoordinatorDashboard";

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isLoginValid = formData.email && formData.password;
  const isSignupValid =
    formData.uin &&
    formData.indexNumber &&
    formData.email &&
    formData.password &&
    formData.password === formData.confirmPassword;

  // New function to handle the Enter key and Form submission
  const handleFormSubmit = (e) => {
    e.preventDefault(); // Prevents page reload
    const isValid = view === "login" ? isLoginValid : isSignupValid;
    if (isValid && !isLoading) {
      handleAction();
    }
  };

  const handleAction = async () => {
    setIsLoading(true);
    try {
      const endpoint = view === "login" ? "auth/login" : "auth/register";
      const response = await axios.post(
        `http://localhost/uds-api/${endpoint}`,
        formData
      );

      if (response.data.status === "success") {
        if (view === "login") {
          setUser(response.data.user);
        } else {
          alert(response.data.message);
          setView("login");
        }
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Connection failed. Check XAMPP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setFormData({
      email: "",
      password: "",
      uin: "",
      indexNumber: "",
      confirmPassword: "",
    });
  };

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
                    onClick={() => setView("signup")}
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
                {["uin", "indexNumber", "email"].map((field) => (
                  <InputField
                    key={field}
                    name={field}
                    placeholder={field.toUpperCase()}
                    value={formData[field]}
                    onChange={handleChange}
                    isFocused={focusedField === field}
                    onFocus={() => setFocusedField(field)}
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
                    onClick={() => setView("login")}
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
        </div>
      )}
    </div>
  );
}

export default App;
