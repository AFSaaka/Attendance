import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./navbar";
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
  const [attendanceStatus, setAttendanceStatus] = useState({
    message: "",
    type: "",
  });
  useEffect(() => {
    document.title = "TTFPP | Student Dashboard";
  }, []);
  // --- Consolidated Status Check ---
  const checkStatus = useCallback(async () => {
    // 1. Changed from .id to .uin
    if (!user?.uin) return;

    try {
      // 2. Using uin for the API call as well
      const response = await axios.get(
        `student/check_daily_status?user_id=${user.uin}`
      );
      const isSigned = response.data.signed;
      setHasSignedToday(isSigned);

      const today = new Date().toISOString().split("T")[0];
      // 3. Changed key name to use .uin
      localStorage.setItem(
        `signed_${user.uin}_${today}`,
        JSON.stringify(isSigned)
      );
    } catch (err) {
      if (!navigator.onLine) {
        const today = new Date().toISOString().split("T")[0];
        // 4. Changed key name to use .uin for offline retrieval
        const cachedStatus = localStorage.getItem(
          `signed_${user.uin}_${today}`
        );
        if (cachedStatus !== null) {
          setHasSignedToday(JSON.parse(cachedStatus));
        }
      }
      console.error("Status check failed", err);
    }
  }, [user]);
  // Add this effect inside your StudentDashboard component
  useEffect(() => {
    const runSync = async () => {
      // 1. Only show "Syncing" if we actually have something to sync
      // (Optional: you could check localStorage.getItem("pending_attendance") first)

      console.log("Checking for offline records to sync...");

      try {
        const result = await syncOfflineAttendance();

        if (result.success && result.count > 0) {
          // 2. Show success message to the user
          setAttendanceStatus({
            message: `Synced ${result.count} offline records!`,
            type: "success",
          });

          // Refresh the UI status
          checkStatus();

          // 3. Clear the success message after 4 seconds
          setTimeout(() => {
            setAttendanceStatus({ message: "", type: "" });
          }, 4000);
        }
      } catch (error) {
        setAttendanceStatus({
          message: "Background sync failed. Will retry later.",
          type: "error",
        });
      }
    };

    runSync();
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
      if (response.data.status === "success") {
        const data = response.data.placement;
        setPlacement(data);
        // CACHE for offline use - Changed user.id to user.uin
        localStorage.setItem(`placement_${user.uin}`, JSON.stringify(data));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        onLogout();
      } else if (!navigator.onLine) {
        // LOAD from cache if offline - Changed user.id to user.uin
        const cached = localStorage.getItem(`placement_${user.uin}`);
        if (cached) setPlacement(JSON.parse(cached));
      }
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
    // 1. Handle "Already Signed" - Use 'info' style
    if (hasSignedToday) {
      setAttendanceStatus({
        message: "Attendance already recorded for today.",
        type: "info",
      });
      return;
    }

    // 2. Handle "Out of Range" - Use 'error' style
    if (
      placement?.coordinate_check !== false &&
      distance !== null &&
      !isInRange &&
      location.accuracy <= 100
    ) {
      setAttendanceStatus({
        message: `Too far away (${Math.round(distance)}m). Move within 200m.`,
        type: "error",
      });
      return;
    }

    // 3. Clear any existing messages if validation passes
    setAttendanceStatus({ message: "", type: "" });

    // 4. Open the confirmation modal
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
      community_id: placement?.community_id,
      session_id: placement?.session_id,
      status: "present",
      week_number: progress.week,
      day_number: progress.day,
      captured_at: new Date().toISOString(),
    };

    // Inside confirmAttendanceSubmission
    try {
      const response = await axios.post(
        "student/submit_attendance",
        attendanceData
      );

      if (response.data.status === "success") {
        setHasSignedToday(true);
        setAttendanceStatus({
          message: "Attendance verified successfully!",
          type: "success",
        }); // NEW
        return true;
      } else {
        // REPLACED alert with status UI
        setAttendanceStatus({ message: response.data.message, type: "error" });
        return false;
      }
    } catch (err) {
      if (!err.response) {
        saveAttendanceOffline(attendanceData);
        setHasSignedToday(true);
        // NEW: Notify the user it's stored locally
        setAttendanceStatus({
          message: "Offline: Saved to device storage.",
          type: "info",
        });
        return true;
      }
      // REPLACED alert with status UI
      setAttendanceStatus({
        message: err.response?.data?.message || "Submission failed",
        type: "error",
      });
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

  const isInRange =
    placement?.coordinate_check === false || placement?.coordinate_check === 0
      ? true
      : checkIsInRange(distance, 200);
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
          status={attendanceStatus}
          isInRange={isInRange}
          distance={distance}
          buttonText={
            hasSignedToday ? "Attendance Completed" : "Take Attendance Now"
          }
          buttonDisabled={
            hasSignedToday || !location.lat || !location.lng || isSubmitting
          }
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {/* Live status indicator for instant tracking feel */}
                {!location.error && location.lat && (
                  <div style={styles.gpsBadge}>
                    <span className="pulse-dot"></span> LIVE
                  </div>
                )}
                <button onClick={handleRefreshClick} style={styles.refreshBtn}>
                  <RefreshCw
                    size={16}
                    className={isRefreshing ? "spin-animation" : ""}
                  />
                </button>
              </div>
            </div>

            <div style={styles.contentGrid}>
              {placement?.coordinate_check === false && (
                <div
                  style={{
                    ...styles.statusBox,
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    marginBottom: "10px",
                  }}
                >
                  <Info size={16} />
                  <span>GPS verification is optional for this community.</span>
                </div>
              )}

              {location.error ? (
                <div style={styles.errorBox}>{location.error}</div>
              ) : (
                <>
                  {/* Current Student Location */}
                  <p style={styles.sectionLabel}>Your Current Location:</p>
                  <div
                    style={{
                      ...styles.coordBox,
                      border: location.lat
                        ? "1px solid #94fc86ff"
                        : "1px solid #ffd700", // Yellow border while searching
                    }}
                  >
                    <div>
                      <small style={styles.miniLabel}>LAT</small>
                      <br />
                      <strong
                        style={{ color: location.lat ? "#1e293b" : "#94a3b8" }}
                      >
                        {location.lat
                          ? location.lat.toFixed(6)
                          : "Searching..."}
                      </strong>
                    </div>
                    <div style={styles.coordDivider}>
                      <small style={styles.miniLabel}>LNG</small>
                      <br />
                      <strong
                        style={{ color: location.lng ? "#1e293b" : "#94a3b8" }}
                      >
                        {location.lng
                          ? location.lng.toFixed(6)
                          : "Searching..."}
                      </strong>
                    </div>
                  </div>

                  {/* NEW: Accuracy Indicator */}
                  {location.accuracy && (
                    <div
                      style={{
                        fontSize: "11px",
                        marginTop: "5px",
                        color: location.accuracy > 100 ? "#991b1b" : "#166534",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Info size={12} />
                      Signal Accuracy: ±{Math.round(location.accuracy)}m
                      {location.accuracy > 100 &&
                        " (Weak signal - try moving outdoors)"}
                    </div>
                  )}

                  {/* Community Target Location (NEW SECTION) */}
                  <p style={{ ...styles.sectionLabel, marginTop: "15px" }}>
                    Community Target:
                  </p>
                  <div
                    style={{
                      ...styles.coordBox,
                      backgroundColor: "#f1f5f9",
                      borderStyle: "dashed",
                    }}
                  >
                    <div>
                      <small style={styles.miniLabel}>TARGET LAT</small>
                      <br />
                      <code style={{ color: "#475569" }}>
                        {parseFloat(placement?.community_lat || 0).toFixed(6)}
                      </code>
                    </div>
                    <div style={styles.coordDivider}>
                      <small style={styles.miniLabel}>TARGET LNG</small>
                      <br />
                      <code style={{ color: "#475569" }}>
                        {parseFloat(placement?.community_lng || 0).toFixed(6)}
                      </code>
                    </div>
                  </div>

                  {/* Distance Badge */}
                  <div
                    style={{
                      ...styles.distanceBadge,
                      backgroundColor:
                        placement?.coordinate_check === false || isInRange
                          ? "#f0fdf4"
                          : "#fef2f2",
                      color:
                        placement?.coordinate_check === false || isInRange
                          ? "#166534"
                          : "#991b1b",
                    }}
                  >
                    <MapPin size={16} />
                    <span>
                      {distance !== null
                        ? `${Math.round(distance)}m from target`
                        : "Locating..."}
                      {placement?.coordinate_check === false && " (Verified)"}
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
  miniLabel: {
    fontSize: "9px",
    color: "#64748b",
    fontWeight: "bold",
    letterSpacing: "0.5px",
  },
  // Ensure coordBox has a transition for a smooth feel
  coordBox: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    backgroundColor: "#f8fafc",
    padding: "12px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    gap: "10px",
    transition: "all 0.3s ease",
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
