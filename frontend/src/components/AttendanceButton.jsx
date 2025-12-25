// components/AttendanceButton.jsx
import React from "react";
import { BadgeCheck } from "lucide-react";

const AttendanceButton = ({ location, onClick, disabled }) => {
  // Production Security: Prevent clicking if location is spoofed or missing
  const isLocationReady = location.lat && location.lng && !location.error;

  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: isLocationReady ? "#fbbf24" : "#94a3b8",
    color: "#000",
    padding: "12px 24px",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "1rem",
    border: "none",
    cursor: isLocationReady ? "pointer" : "not-allowed",
    transition: "all 0.2s ease",
    boxShadow: isLocationReady ? "0 4px 15px rgba(251, 191, 36, 0.3)" : "none",
    marginTop: "20px",
  };

  return (
    <button
      style={buttonStyle}
      onClick={onClick}
      disabled={!isLocationReady || disabled}
      title={
        !isLocationReady
          ? "GPS Signal required to take attendance"
          : "Click to Clock-in"
      }
    >
      {isLocationReady ? "Take Attendance Now" : "Waiting for GPS..."}
      <BadgeCheck size={25} />
    </button>
  );
};

export default AttendanceButton;
