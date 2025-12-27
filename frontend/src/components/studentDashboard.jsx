import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./navBar";
import Footer from "./footer";
import axios from "../api/axios";
import DashboardHero from "./DashboardHero";
import AttendanceModal from "./AttendanceModal";
import {
  saveAttendanceOffline,
  syncOfflineAttendance, // <--- Add this specifically
  calculateProgramProgress,
} from "../utils/attendanceUtils";
import { calculateDistance, checkIsInRange } from "../utils/gpsUtils";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasSignedToday, setHasSignedToday] = useState(false);

  // --- Consolidated Status Check ---
  const checkStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get(
        `student/check_daily_status.php?user_id=${user.id}`
      );
      setHasSignedToday(response.data.signed);
    } catch (err) {
      console.error("Status check failed", err);
    }
  }, [user]);
  // Add this effect inside your StudentDashboard component
  useEffect(() => {
    const runSync = async () => {
      console.log("Checking for offline records to sync...");
      const result = await syncOfflineAttendance();

      if (result.success && result.count > 0) {
        console.log(`Successfully synced ${result.count} records.`);
        // Refresh the UI status since we just uploaded new data
        checkStatus();
      }
    };

    // Scenario 1: Run when the dashboard first loads
    runSync();

    // Scenario 2: Run whenever the browser goes from 'offline' to 'online'
    window.addEventListener("online", runSync);

    return () => {
      window.removeEventListener("online", runSync);
    };
  }, [checkStatus]);
  useEffect(() => {
    if (user) {
      checkStatus();
      getPlacementData();
    }
  }, [user, checkStatus]);

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

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshGPS();
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const handleAttendance = () => {
    if (hasSignedToday) return alert("Already recorded for today!");
    if (!isInRange)
      return alert(
        `Too far away (${Math.round(distance)}m). Move within 200m.`
      );
    setIsModalOpen(true);
  };

  // --- Optimized Submission Logic ---
  const confirmAttendanceSubmission = async () => {
    setIsSubmitting(true);
    const progress = calculateProgramProgress(placement?.start_date);

    const attendanceData = {
      latitude: location.lat,
      longitude: location.lng,
      user_id: user?.id || user?.user_id,
      enrollment_id: placement?.id,
      status: "present",
      week_number: progress.week,
      day_number: progress.day,
      captured_at: new Date().toISOString(),
    };

    try {
      const response = await axios.post(
        "student/submit_attendance",
        attendanceData
      );

      if (response.data.status === "success") {
        setHasSignedToday(true);
        return true; // Tells AttendanceModal to show Success UI
      } else {
        alert(`Denied: ${response.data.message}`);
        return false;
      }
    } catch (err) {
      if (!err.response) {
        // Device is OFFLINE
        saveAttendanceOffline(attendanceData);
        setHasSignedToday(true);
        return true; // Still return true so Modal shows "Saved Offline" success
      }
      alert(err.response?.data?.message || "Submission failed");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Calculations ---
  const distance =
    location.lat && location.lng && placement?.community_lat
      ? calculateDistance(
          location.lat,
          location.lng,
          parseFloat(placement.community_lat),
          parseFloat(placement.community_lng)
        )
      : null;

  const isInRange = checkIsInRange(distance, 200);
  const fullName = placement?.full_name || user?.name || "Student";

  return (
    <div style={styles.container}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />

      <main style={styles.main}>
        <DashboardHero
          fullName={loadingPlacement ? "..." : fullName}
          academicLevel={placement?.level || "N/A"}
          uin={user?.uin}
          role={user?.role}
          location={location}
          onAttendance={handleAttendance}
          isSubmitting={isSubmitting}
          isInRange={isInRange}
          distance={distance}
          buttonText={
            hasSignedToday ? "Attendance Completed" : "Take Attendance Now"
          }
          buttonDisabled={hasSignedToday || !isInRange || isSubmitting}
        />

        <AttendanceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={confirmAttendanceSubmission} // Returns true/false
          placement={placement}
          isSubmitting={isSubmitting}
        />

        <div style={styles.grid}>
          {/* Card 1: Profile */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                <User size={24} color="#198104" /> Profile
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
                value={placement?.index_number || "N/A"}
              />
              <DetailRow
                icon={<BookOpen size={18} />}
                label="Program"
                value={placement?.program || "N/A"}
              />
              <DetailRow
                icon={<Layers size={18} />}
                label="Level"
                value={placement?.level || "N/A"}
              />
            </div>
          </div>

          {/* Card 2: Placement */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                <MapPin size={24} color="#198104" /> Placement
              </h3>
              {placement && <CheckCircle size={24} color="#198104" />}
            </div>
            <div style={styles.contentGrid}>
              <DetailRow
                icon={<Navigation size={18} />}
                label="District"
                value={placement?.district || "..."}
              />
              <DetailRow
                icon={<MapPin size={18} />}
                label="Community"
                value={placement?.community || "..."}
              />
              <DetailRow
                icon={<Calendar size={18} />}
                label="Academic Year"
                value={placement?.academic_year || "..."}
              />
              <div style={styles.statusBox}>
                <CheckCircle size={16} /> Verified Field Assignment
              </div>
            </div>
          </div>

          {/* Card 3: Live Tracker */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                <Navigation size={24} color="#0c0481" /> Live Tracker
              </h3>
              <button onClick={handleRefreshClick} style={styles.refreshBtn}>
                <RefreshCw
                  size={16}
                  className={isRefreshing ? "spin-animation" : ""}
                />
              </button>
            </div>
            <div style={styles.contentGrid}>
              {location.error ? (
                <div style={styles.errorBox}>{location.error}</div>
              ) : (
                <>
                  <p style={styles.sectionLabel}>Your Location:</p>
                  <div style={styles.coordBox}>
                    <div>
                      <small>LAT</small>
                      <br />
                      <strong>{location.lat?.toFixed(6) || "0.0"}</strong>
                    </div>
                    <div style={styles.coordDivider}>
                      <small>LNG</small>
                      <br />
                      <strong>{location.lng?.toFixed(6) || "0.0"}</strong>
                    </div>
                  </div>
                  <div
                    style={{
                      ...styles.distanceBadge,
                      backgroundColor: isInRange ? "#f0fdf4" : "#fef2f2",
                      color: isInRange ? "#166534" : "#991b1b",
                    }}
                  >
                    <MapPin size={16} />
                    <span>
                      {distance !== null
                        ? `${Math.round(distance)}m from target`
                        : "Locating..."}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

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
    border: "1px solid #b1faa8ff",
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
  sectionLabel: {
    color: "#64748b",
    margin: "10px 0 5px 0",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  coordDivider: {
    borderLeft: "1px solid #cbd5e1",
    paddingLeft: "15px",
  },
  distanceBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "12px",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "14px",
    marginTop: "5px",
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
