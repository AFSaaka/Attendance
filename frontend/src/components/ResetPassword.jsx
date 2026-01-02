import React, { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import axios from "../api/axios";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Status state for UI feedback
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleReset = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match!" });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/auth/reset-password", { password });

      // 1. Display Success State
      setStatus({
        type: "success",
        message: res.data.message || "Password updated successfully!",
      });

      // 2. Clear frontend session
      localStorage.removeItem("uds_user");

      // 3. Delay redirect so user can see the success message
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err.response?.data?.message || "Reset failed. Please try again.",
      });
      setLoading(false);
    }
  };

  // If success, we can optionally hide the form and just show the success message
  if (status.type === "success") {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ ...styles.iconCircle, background: "#f6ffed" }}>
            <CheckCircle2 size={40} color="#52c41a" />
          </div>
          <h2 style={styles.title}>Success!</h2>
          <p style={styles.subtitle}>{status.message}</p>
          <p style={{ fontSize: "12px", color: "#8c8c8c" }}>
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleReset} style={styles.card}>
        <div style={styles.iconCircle}>
          <ShieldCheck size={32} color="#02c021ff" />
        </div>
        <h2 style={styles.title}>Update Password</h2>
        <p style={styles.subtitle}>
          Set a permanent password to secure your account.
        </p>

        {status.type === "error" && (
          <div style={styles.errorBanner}>
            <AlertCircle size={16} /> {status.message}
          </div>
        )}

        <div style={styles.inputGroup}>
          <label style={styles.label}>New Password</label>
          <div style={styles.inputWrapper}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              type={showPass ? "text" : "password"}
              style={styles.input}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={styles.eyeBtn}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Confirm New Password</label>
          <div style={styles.inputWrapper}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              type="password"
              style={styles.input}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Update & Sign Out"
          )}
        </button>
      </form>
    </div>
  );
};

const styles = {
  // ... (previous styles remain the same)
  container: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f8fafc",
    padding: "20px",
  },
  card: {
    background: "#fff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center",
  },
  iconCircle: {
    width: "64px",
    height: "64px",
    background: "#dbeafe",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "32px",
    lineHeight: "1.6",
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px",
    background: "#fff1f0",
    border: "1px solid #ffa39e",
    color: "#cf1322",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "20px",
    textAlign: "left",
  },
  inputGroup: { textAlign: "left", marginBottom: "20px" },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
    marginBottom: "8px",
  },
  inputWrapper: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: "12px", color: "#94a3b8" },
  input: {
    width: "100%",
    padding: "12px 12px 12px 40px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
  },
  submitBtn: {
    width: "100%",
    padding: "12px",
    background: "#2eb107ff",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
  },
};

export default ResetPassword;
