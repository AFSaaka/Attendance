import React, { useState, useRef, useEffect } from "react";
import PrimaryButton from "./primaryButton";

const OtpInput = ({ onVerify, onResend, onContinue, isLoading, email }) => {
  const [otp, setOtp] = useState(new Array(6).fill(""));
  const [timer, setTimer] = useState(60);
  const [status, setStatus] = useState({ type: "", text: "" }); // To handle inline errors/success
  const inputRefs = useRef([]);

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (element, index) => {
    if (!/^\d*$/.test(element.value)) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Auto-focus next
    if (element.value !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    // Clear error message when user starts typing again
    if (status.type === "error") setStatus({ type: "", text: "" });
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    setStatus({ type: "", text: "" });
    const fullOtp = otp.join("");
    const success = await onVerify(fullOtp);

    if (success) {
      setStatus({ type: "success", text: "" });
    } else {
      setStatus({
        type: "error",
        text: "Invalid or expired code. Please try again.",
      });
    }
  };

  const handleResendClick = () => {
    if (timer === 0) {
      onResend();
      setTimer(60);
      setStatus({ type: "", text: "" });
    }
  };

  // --- SUCCESS VIEW (The Card Overlay) ---
  if (status.type === "success") {
    return (
      <div style={successCardStyle}>
        <div style={checkmarkCircleStyle}>✓</div>
        <h3 style={{ color: "#198104", margin: "10px 0" }}>Email Verified!</h3>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
          Your account has been successfully claimed.
        </p>
        <PrimaryButton onClick={onContinue}>Continue to Login</PrimaryButton>
      </div>
    );
  }

  // --- DEFAULT OTP VIEW ---
  return (
    <div style={{ textAlign: "center", padding: "10px" }}>
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>
        Enter the 6-digit code sent to
      </p>
      <strong style={{ fontSize: "14px", color: "#333" }}>{email}</strong>

      <div
        style={{
          display: "flex",
          gap: "8px",
          justifyContent: "center",
          margin: "25px 0",
        }}
      >
        {otp.map((data, index) => (
          <input
            key={index}
            type="text"
            maxLength="1"
            ref={(el) => (inputRefs.current[index] = el)}
            value={data}
            onChange={(e) => handleChange(e.target, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={{
              ...inputBoxStyle,
              borderColor: status.type === "error" ? "#ff4d4f" : "#ddd",
            }}
          />
        ))}
      </div>

      {status.type === "error" && (
        <p style={{ color: "#ff4d4f", fontSize: "13px", marginBottom: "15px" }}>
          {status.text}
        </p>
      )}

      <PrimaryButton
        disabled={otp.join("").length < 6 || isLoading}
        isLoading={isLoading}
        onClick={handleVerify}
      >
        Verify Account
      </PrimaryButton>

      <div style={{ marginTop: "20px" }}>
        {timer > 0 ? (
          <span style={{ fontSize: "13px", color: "#999" }}>
            Resend code in <strong>{timer}s</strong>
          </span>
        ) : (
          <button onClick={handleResendClick} style={resendButtonStyle}>
            Resend OTP
          </button>
        )}
      </div>
    </div>
  );
};

// --- STYLES ---
const inputBoxStyle = {
  width: "42px",
  height: "52px",
  textAlign: "center",
  fontSize: "22px",
  fontWeight: "600",
  border: "2px solid #ddd",
  borderRadius: "10px",
  outline: "none",
  transition: "all 0.2s ease",
};

const successCardStyle = {
  textAlign: "center",
  padding: "30px 10px",
  animation: "fadeIn 0.4s ease-out",
};

const checkmarkCircleStyle = {
  width: "65px",
  height: "65px",
  backgroundColor: "#e8f5e9",
  color: "#198104",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  margin: "0 auto 15px",
  border: "2px solid #198104",
};

const resendButtonStyle = {
  background: "none",
  border: "none",
  color: "#198104",
  cursor: "pointer",
  fontWeight: "700",
  fontSize: "13px",
};

export default OtpInput;
