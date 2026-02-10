import React, { useState, useEffect } from "react";
import AttendanceButton from "./AttendanceButton";
import { Layers, Wifi, WifiOff } from "lucide-react";

const DashboardHero = ({
  fullName,
  academicLevel,
  uin,
  role,
  location,
  onAttendance,
  isSubmitting,
  status,
  isCompleted,
  buttonText,
  buttonDisabled,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("resize", handleResize);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const heroStyle = {
    background: "linear-gradient(135deg, #198104 0%, #0d4d02 100%)",
    color: "white",
    padding: isMobile ? "30px 20px" : "40px clamp(40px, 8vw, 50px)",
    borderRadius: "24px",
    marginBottom: "25px",
    boxShadow: "0 20px 40px rgba(25, 129, 4, 0.15)",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    justifyContent: "space-between",
    alignItems: "center",
    textAlign: isMobile ? "center" : "left",
    gap: "20px",
    position: "relative",
    overflow: "hidden",
  };

  const badgeStyle = {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: "8px 16px",
    borderRadius: "30px",
    fontSize: "14px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "15px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  const statusBadgeStyle = {
    backgroundColor: isOnline
      ? "rgba(34, 197, 94, 0.25)"
      : "rgba(248, 245, 55, 0.3)",
    color: isOnline ? "#fcfcfcff" : "#f7fa51ff",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.5px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: isOnline
      ? "1px solid rgba(34, 197, 94, 0.4)"
      : "1px solid rgba(239, 208, 68, 0.4)",
    marginBottom: "10px",
    textTransform: "uppercase",
  };
  const renderAttendanceButton = () => (
    <AttendanceButton
      location={location}
      onClick={onAttendance}
      disabled={buttonDisabled} // Use the logic from StudentDashboard
      status={status}
      isCompleted={isCompleted} // Pass the white-mode flag
      buttonText={buttonText} // Pass the "Submitted" text
    />
  );
  return (
    <section style={heroStyle}>
      {/* Decorative Background Element */}
      <div
        className="top"
        style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "300px",
          height: "300px",
          background: "rgba(255, 255, 255, 0.12)",
          borderRadius: "50%",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-10%",
          width: "200px",
          height: "200px",
          background: "rgba(162, 165, 6, 0.2)",
          borderRadius: "50%",
          zIndex: 1,
        }}
      />

      <div
        style={{
          zIndex: 2,
          maxWidth: isMobile ? "100%" : "65%",
          display: "flex",
          flexDirection: "column",
          alignItems: isMobile ? "center" : "flex-start",
        }}
      >
        {/* Connection Status Badge */}
        <div style={statusBadgeStyle}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? "System Online" : "Offline Mode Active"}
        </div>

        <h1
          style={{
            fontSize: isMobile ? "1.8rem" : "2.4rem",
            fontWeight: "800",
            lineHeight: "1.2",
            margin: "5px 0 10px 0",
          }}
        >
          Welcome, {fullName}!
        </h1>

        <p
          style={{
            fontSize: "1.1rem",
            opacity: 0.9,
            margin: "0 0 15px 0",
            maxWidth: "500px",
          }}
        >
          Ready for your{" "}
          <span
            style={{ fontWeight: "bold", borderBottom: "3px solid #fbbf24" }}
          >
            {academicLevel}
          </span>{" "}
          TTFPP experience?
        </p>

        <div style={badgeStyle}>
          <Layers size={16} />
          <span>UIN: {uin}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ fontWeight: "bold" }}>{role?.toUpperCase()}</span>
        </div>

        {/* Mobile View: Attendance Button */}
        {isMobile && (
          <div
            style={{
              marginTop: "25px",
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {renderAttendanceButton()}
          </div>
        )}
      </div>

      {/* Desktop View: Attendance Button */}
      {!isMobile && (
        <div style={{ zIndex: 2, marginRight: "40px" }}>
          {renderAttendanceButton()}
        </div>
      )}
    </section>
  );
};

export default DashboardHero;
