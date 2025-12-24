import React, { useState, useEffect } from "react";
import Navbar from "./navBar";
import Footer from "./footer";
import axios from "../api/axios";
// Import high-quality icons
import {
  User,
  MapPin,
  Navigation,
  CheckCircle,
  Info,
  Calendar,
  Layers,
} from "lucide-react";

const StudentDashboard = ({ user, onLogout }) => {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    error: null,
  });
  const [placement, setPlacement] = useState(null);
  const [loadingPlacement, setLoadingPlacement] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
        }),
      (err) =>
        setLocation((prev) => ({ ...prev, error: "Location access denied" })),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const getPlacementData = async () => {
      try {
        const response = await axios.get("student/get_placement");
        if (response.data.status === "success") {
          setPlacement(response.data.placement);
        }
      } catch (err) {
        if (err.response?.status === 401) onLogout();
      } finally {
        setLoadingPlacement(false);
      }
    };
    getPlacementData();
  }, [onLogout]);

  const fullName = placement?.full_name || user?.name || "Student";
  const academicLevel = placement?.level || "not found";

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#f8fafc",
      width: "100%",
    },
    main: {
      flex: 1,
      // Dynamic padding: 20px on mobile, scales up to 4vw on laptop
      padding: "clamp(20px, 4vw, 50px)",
      width: "100%",
      boxSizing: "border-box",
    },
    welcomeHero: {
      background: "linear-gradient(135deg, #198104 0%, #0d4d02 100%)",
      color: "white",
      padding: "clamp(30px, 5vw, 60px)",
      borderRadius: "24px",
      marginBottom: "30px",
      boxShadow: "0 20px 40px rgba(25, 129, 4, 0.15)",
    },
    grid: {
      display: "grid",
      // This logic handles 1 column on mobile and 2-3 columns on laptop automatically
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 450px), 1fr))",
      gap: "30px",
      width: "100%",
    },
    card: {
      backgroundColor: "white",
      padding: "clamp(20px, 3vw, 35px)",
      borderRadius: "20px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
      display: "flex",
      flexDirection: "column",
    },
    badge: {
      backgroundColor: "rgba(255,255,255,0.15)",
      padding: "8px 16px",
      borderRadius: "30px",
      fontSize: "14px",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      marginTop: "20px",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.1)",
    },
  };

  return (
    <div style={styles.container}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />

      <main style={styles.main}>
        {/* Hero Section */}
        <section style={styles.welcomeHero}>
          <div style={{ position: "relative", zIndex: 2 }}>
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "800",
                marginBottom: "12px",
              }}
            >
              Welcome, {loadingPlacement ? "..." : fullName}!
            </h1>
            <p style={{ fontSize: "1.2rem", opacity: 0.9, maxWidth: "600px" }}>
              Ready for your{" "}
              <span
                style={{
                  fontWeight: "bold",
                  borderBottom: "3px solid #fbbf24",
                }}
              >
                {academicLevel}
              </span>{" "}
              TTFPP field experience?
            </p>
            <div style={styles.badge}>
              <Layers size={16} />
              <span>ID: {user?.uin}</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span style={{ fontWeight: "bold" }}>
                {user?.role?.toUpperCase()}
              </span>
            </div>
          </div>
        </section>

        <div style={styles.grid}>
          {/* Placement Card */}
          <div style={styles.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "#1e293b",
                  fontSize: "1.4rem",
                }}
              >
                <MapPin size={24} color="#198104" /> My Placement
              </h3>
              {placement && <CheckCircle size={24} color="#198104" />}
            </div>

            <div style={{ display: "grid", gap: "20px" }}>
              {loadingPlacement ? (
                <p>Loading your field data...</p>
              ) : placement ? (
                <>
                  <DetailRow
                    icon={<Navigation size={18} />}
                    label="District"
                    value={placement.district}
                  />
                  <DetailRow
                    icon={<MapPin size={18} />}
                    label="Community"
                    value={placement.community}
                  />
                  <DetailRow
                    icon={<Calendar size={18} />}
                    label="Academic Year"
                    value={placement.academic_year}
                  />
                  <div style={statusStyle}>
                    <CheckCircle size={16} /> Verified Field Assignment
                  </div>
                </>
              ) : (
                <div style={errorBox}>
                  <Info size={20} /> No placement record found in registry.
                </div>
              )}
            </div>
          </div>

          {/* Attendance/Location Card */}
          <div style={styles.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "#1e293b",
                  fontSize: "1.4rem",
                }}
              >
                <Navigation size={24} color="#0c0481" /> Live Tracker
              </h3>
              <div style={location.lat ? pulseContainer : {}}>
                <div className={location.lat ? "dot" : ""}></div>
              </div>
            </div>

            <div style={{ display: "grid", gap: "20px" }}>
              {location.error ? (
                <div style={errorBox}>{location.error}</div>
              ) : location.lat ? (
                <>
                  <p style={{ color: "#64748b", margin: 0 }}>
                    Active tracking session for attendance:
                  </p>
                  <div style={coordStyle}>
                    <div>
                      <small>LATITUDE</small>{" "}
                      <strong>{location.lat.toFixed(6)}</strong>
                    </div>
                    <div
                      style={{
                        borderLeft: "1px solid #cbd5e1",
                        paddingLeft: "15px",
                      }}
                    >
                      <small>LONGITUDE</small>{" "}
                      <strong>{location.lng.toFixed(6)}</strong>
                    </div>
                  </div>
                  <div style={gpsActiveStyle}>
                    <CheckCircle size={14} /> GPS SIGNAL ENCRYPTED & SECURE
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <p>Connecting to satellites...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// Refactored Detail Row with Icons
const DetailRow = ({ icon, label, value }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      padding: "12px 0",
      borderBottom: "1px solid #f1f5f9",
    }}
  >
    <div style={{ marginRight: "15px", color: "#64748b" }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <small
        style={{
          display: "block",
          color: "#94a3b8",
          fontWeight: "600",
          textTransform: "uppercase",
          fontSize: "10px",
          letterSpacing: "1px",
        }}
      >
        {label}
      </small>
      <span style={{ fontSize: "1.1rem", color: "#334155", fontWeight: "600" }}>
        {value}
      </span>
    </div>
  </div>
);

// Styles
const statusStyle = {
  marginTop: "10px",
  padding: "12px",
  backgroundColor: "#f0fdf4",
  color: "#166534",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontSize: "14px",
  fontWeight: "bold",
};

const coordStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  backgroundColor: "#f8fafc",
  padding: "20px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  gap: "15px",
};

const gpsActiveStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#166534",
  fontSize: "11px",
  letterSpacing: "0.5px",
  fontWeight: "800",
};

const pulseContainer = {
  width: "24px",
  height: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const errorBox = {
  padding: "16px",
  backgroundColor: "#fef2f2",
  color: "#991b1b",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
};

export default StudentDashboard;
