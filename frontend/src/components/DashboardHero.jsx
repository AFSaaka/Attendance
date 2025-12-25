import React, { useState, useEffect } from "react";
import AttendanceButton from "./AttendanceButton";
import { Layers } from "lucide-react";

const DashboardHero = ({
  fullName,
  academicLevel,
  uin,
  role,
  location,
  onAttendance,
  isSubmitting,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    // CENTER items on mobile, align center vertically on desktop
    alignItems: "center",
    // CENTER text on mobile
    textAlign: isMobile ? "center" : "left",
    gap: "20px",
    position: "relative",
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

  return (
    <section style={heroStyle}>
      <div
        style={{
          zIndex: 2,
          maxWidth: isMobile ? "100%" : "60%",
          display: "flex",
          flexDirection: "column",
          // Ensures the inner items (like the badge) also center on mobile
          alignItems: isMobile ? "center" : "flex-start",
        }}
      >
        <h1
          style={{
            fontSize: "2.2rem",
            fontWeight: "800",
            marginBottom: "8px",
            margin: 0,
          }}
        >
          Welcome, {fullName}!
        </h1>
        <p style={{ fontSize: "1.1rem", opacity: 0.9, margin: "8px 0" }}>
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

        {/* Mobile View: Button appears here centered */}
        {isMobile && (
          <div
            style={{
              marginTop: "0",
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <AttendanceButton
              location={location}
              onClick={onAttendance}
              disabled={isSubmitting}
            />
          </div>
        )}
      </div>

      {/* Desktop View: Button stays on the right */}
      {!isMobile && (
        <div style={{ zIndex: 2, marginRight: "80px", marginBottom: "40px" }}>
          <AttendanceButton
            location={location}
            onClick={onAttendance}
            disabled={isSubmitting}
          />
        </div>
      )}
    </section>
  );
};

export default DashboardHero;
