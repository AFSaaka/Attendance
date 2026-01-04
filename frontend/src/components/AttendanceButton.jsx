import React from "react";
import { BadgeCheck, Loader2, AlertCircle, Info } from "lucide-react";

const AttendanceButton = ({
  location,
  onClick,
  disabled,
  isSubmitting,
  status, // New Prop: { message: string, type: 'error' | 'info' | '' }
}) => {
  const isLocationReady = location.lat && location.lng && !location.error;

  // Dynamic colors based on status type
  const getStatusColors = () => {
    if (status?.type === "error")
      return { color: "#fca5a5", bg: "rgba(239, 68, 68, 0.2)" };
    if (status?.type === "info")
      return { color: "#fbbf24", bg: "rgba(251, 191, 36, 0.2)" };
    return { color: "rgba(255,255,255,0.7)", bg: "transparent" };
  };

  const statusStyle = getStatusColors();

  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    backgroundColor: !isLocationReady || disabled ? "#475569" : "#fbbf24",
    color: "#000",
    padding: "16px 32px",
    borderRadius: "16px",
    fontWeight: "800",
    fontSize: "1.1rem",
    border: "none",
    cursor: !isLocationReady || disabled ? "not-allowed" : "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow:
      !isLocationReady || disabled
        ? "none"
        : "0 10px 20px rgba(251, 191, 36, 0.3)",
    width: "100%", // Better for mobile touch targets
    maxWidth: "280px",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <button
        style={buttonStyle}
        onClick={onClick}
        disabled={!isLocationReady || disabled || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 size={24} className="spin-animation" />
        ) : (
          <BadgeCheck size={24} />
        )}
        <span style={{ marginLeft: "5px" }}>
          {isSubmitting
            ? "Verifying..."
            : isLocationReady
            ? "Clock-in Now"
            : "Waiting for GPS..."}
        </span>
      </button>

      {/* IN-UI MESSAGING BOX */}
      {status?.message && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "12px",
            fontSize: "0.85rem",
            fontWeight: "600",
            color: statusStyle.color,
            backgroundColor: statusStyle.bg,
            border: `1px solid ${statusStyle.color}44`,
            animation: "fadeInUp 0.3s ease-out",
          }}
        >
          {status.type === "error" ? (
            <AlertCircle size={14} />
          ) : (
            <Info size={14} />
          )}
          {status.message}
        </div>
      )}
    </div>
  );
};

export default AttendanceButton;
