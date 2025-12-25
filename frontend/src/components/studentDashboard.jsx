import React, { useState, useEffect } from "react";
import Navbar from "./navBar";
import Footer from "./footer";
import axios from "../api/axios";
import DashboardHero from "./DashboardHero";
import {
  User,
  MapPin,
  Navigation,
  CheckCircle,
  Info,
  Calendar,
  Layers,
  BookOpen,
  Fingerprint,
  RefreshCw,
} from "lucide-react";

const StudentDashboard = ({
  user,
  onLogout,
  location = { lat: null, lng: null, error: null },
  onRefreshGPS,
}) => {
  const [placement, setPlacement] = useState(null);
  const [loadingPlacement, setLoadingPlacement] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshGPS();
    // Stop spinning after 1.5 seconds once the hook has had time to restart
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  // --- Attendance Action ---
  const handleAttendance = async () => {
    if (!location.lat) return;
    setIsSubmitting(true);
    try {
      const response = await axios.post("student/take_attendance", {
        lat: location.lat,
        lng: location.lng,
        uin: user?.uin,
      });
      if (response.data.status === "success")
        alert("Attendance recorded successfully!");
    } catch (err) {
      alert("Failed to record attendance. Check connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Fetch Placement ---
  useEffect(() => {
    const getPlacementData = async () => {
      try {
        const response = await axios.get("student/get_placement");
        if (response.data.status === "success")
          setPlacement(response.data.placement);
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

  return (
    <div style={styles.container}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />

      <main style={styles.main}>
        <DashboardHero
          fullName={loadingPlacement ? "..." : fullName}
          academicLevel={academicLevel}
          uin={user?.uin}
          role={user?.role}
          location={location}
          onAttendance={handleAttendance}
          isSubmitting={isSubmitting}
        />

        <div style={styles.grid}>
          {/* Card 1: Profile */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                <User size={24} color="#198104" />
                Profile
              </h3>
            </div>
            <div style={styles.contentGrid}>
              <DetailRow
                icon={<User size={18} />}
                label="Full Name"
                value={fullName}
              />
              <DetailRow
                icon={<Fingerprint size={18} />}
                label="Index Number"
                value={placement?.index_number || user?.index_number || "N/A"}
              />
              <DetailRow
                icon={<BookOpen size={18} />}
                label="Program"
                value={placement?.program || "Program not set"}
              />
              <DetailRow
                icon={<Layers size={18} />}
                label="Current Level"
                value={academicLevel}
              />
            </div>
          </div>

          {/* Card 2: Placement */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                <MapPin size={24} color="#198104" /> My Placement
              </h3>
              {placement && <CheckCircle size={24} color="#198104" />}
            </div>
            <div style={styles.contentGrid}>
              {loadingPlacement ? (
                <p>Loading...</p>
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
                  <div style={styles.statusBox}>
                    <CheckCircle size={16} /> Verified Field Assignment
                  </div>
                </>
              ) : (
                <div style={styles.errorBox}>
                  <Info size={20} /> No placement found.
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Live Tracker */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                <Navigation size={24} color="#0c0481" /> Live Tracker
              </h3>
              {/* ADD THIS BUTTON */}
              <button
                onClick={handleRefreshClick} // Updated handler
                style={styles.refreshBtn}
                title="Refresh GPS Signal"
              >
                <RefreshCw
                  size={16}
                  className={isRefreshing ? "spin-animation" : ""}
                />
              </button>
              <div style={location.lat ? styles.pulseContainer : {}}>
                <div className={location.lat ? "dot" : ""}></div>
              </div>
            </div>
            <div style={styles.contentGrid}>
              {location.error ? (
                <div style={styles.errorBox}>{location.error}</div>
              ) : location.lat ? (
                <>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
                    Active tracking session:
                  </p>
                  <div style={styles.coordBox}>
                    <div>
                      <small>LATITUDE</small>
                      <br />
                      <strong>{location.lat.toFixed(6)}</strong>
                    </div>
                    <div
                      style={{
                        borderLeft: "1px solid #cbd5e1",
                        paddingLeft: "15px",
                      }}
                    >
                      <small>LONGITUDE</small>
                      <br />
                      <strong>{location.lng.toFixed(6)}</strong>
                    </div>
                  </div>
                  <div style={styles.gpsBadge}>
                    <CheckCircle size={14} /> GPS SIGNAL ENCRYPTED
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "10px" }}>
                  <p>Connecting...</p>
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

// --- Child Component for Rows ---
const DetailRow = ({ icon, label, value }) => (
  <div style={styles.detailRow}>
    <div style={{ marginRight: "15px", color: "#64748b" }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <small style={styles.detailLabel}>{label}</small>
      <span style={styles.detailValue}>{value}</span>
    </div>
  </div>
);

// --- Modular Styles Object (Production Ready) ---
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
    padding: "20px clamp(20px, 4vw, 50px)",
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 400px))",
    gap: "20px",
    width: "100%",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "white",
    padding: "20px 25px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  cardTitle: {
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#1e293b",
    fontSize: "1.3rem",
  },
  contentGrid: { display: "grid", gap: "12px" },
  detailRow: {
    display: "flex",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  refreshBtn: {
    background: "#f1f5f9",
    border: "none",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s ease",
    ":hover": { backgroundColor: "#e2e8f0" },
  },
  detailLabel: {
    display: "block",
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
    fontSize: "9px",
    letterSpacing: "1px",
  },
  detailValue: { fontSize: "1rem", color: "#334155", fontWeight: "600" },
  statusBox: {
    marginTop: "5px",
    padding: "10px",
    backgroundColor: "#f0fdf4",
    color: "#166534",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: "bold",
  },
  coordBox: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    backgroundColor: "#f8fafc",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    gap: "10px",
  },
  gpsBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#166534",
    fontSize: "11px",
    letterSpacing: "0.5px",
    fontWeight: "800",
  },
  errorBox: {
    padding: "16px",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
  },
  pulseContainer: {
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default StudentDashboard;
