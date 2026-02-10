import React from "react";
import {
  BadgeCheck,
  Loader2,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";

const AttendanceButton = ({
  location,
  onClick,
  disabled,
  isSubmitting,
  status,
  isCompleted, // Logic: Student has signed
  buttonText, // "Submitted" or "Attendance Completed"
}) => {
  const isLocationReady = location.lat && location.lng && !location.error;

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
    // MODIFIED LOGIC: White background if completed, Gray if disabled/no GPS, Amber if ready
    backgroundColor: isCompleted
      ? "#ffffff"
      : !isLocationReady || disabled
        ? "#475569"
        : "#fbbf24",
    color: isCompleted ? "#198104" : "#000", // Green text when white
    padding: "16px 32px",
    borderRadius: "16px",
    fontWeight: "800",
    fontSize: "1.1rem",
    border: isCompleted ? "2px solid #ffffff" : "none",
    cursor:
      isCompleted || !isLocationReady || disabled ? "not-allowed" : "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: isCompleted
      ? "0 4px 12px rgba(0,0,0,0.1)"
      : !isLocationReady || disabled
        ? "none"
        : "0 10px 20px rgba(251, 191, 36, 0.3)",
    width: "100%",
    maxWidth: "280px",
    opacity: 1, // Ensures white isn't faded when button is technically disabled
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
        // Disable interaction if already completed OR no GPS OR currently submitting
        disabled={isCompleted || !isLocationReady || disabled || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 size={24} className="spin-animation" />
        ) : isCompleted ? (
          <CheckCircle2 size={24} color="#198104" /> // Green checkmark for white button
        ) : (
          <BadgeCheck size={24} />
        )}

        <span style={{ marginLeft: "5px" }}>
          {isSubmitting
            ? "Verifying..."
            : isCompleted
              ? buttonText // Shows "Submitted" or "Completed"
              : isLocationReady
                ? "Take Attendance"
                : "Waiting for GPS..."}
        </span>
      </button>

      {/* Hide status messages if completed, as requested */}
      {status?.message && !isCompleted && (
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
