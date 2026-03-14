import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Navbar from "./navbar";
import Footer from "./footer";
import axios, { setCsrfToken, isCancel } from "../api/axios";
import DashboardHero from "./DashboardHero";
import AttendanceModal from "./AttendanceModal";
import {
  saveAttendanceOffline,
  syncOfflineAttendance,
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
  location = { lat: null, lng: null, error: null, accuracy: null },
  onRefreshGPS,
}) => {
  // 1. STATE
  const [placement, setPlacement] = useState(null);
  const [loadingPlacement, setLoadingPlacement] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasSignedToday, setHasSignedToday] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState({
    message: "",
    type: "",
  });

  const isSyncingRef = useRef(false);
  const lastSyncAttemptRef = useRef(0);

  // 2. CALCULATIONS (Must be defined before functions that use them)
  const distance = useMemo(() => {
    if (location.lat && location.lng && placement?.community_lat) {
      return calculateDistance(
        location.lat,
        location.lng,
        parseFloat(placement.community_lat),
        parseFloat(placement.community_lng),
      );
    }
    return null;
  }, [
    location.lat,
    location.lng,
    placement?.community_lat,
    placement?.community_lng,
  ]);

  const isInRange = useMemo(() => {
    if (
      placement?.coordinate_check === false ||
      placement?.coordinate_check === 0
    )
      return true;
    return checkIsInRange(distance, 500);
  }, [distance, placement?.coordinate_check]);

  // 3. API DATA FETCHING
  const checkStatus = useCallback(
    async (signal) => {
      if (!user?.uin) return;
      try {
        const response = await axios.get(
          `student/check_daily_status?user_id=${user.uin}`,
          { signal },
        );
        setHasSignedToday(response.data.signed);
        localStorage.setItem(
          `signed_${user.uin}_${new Date().toISOString().split("T")[0]}`,
          JSON.stringify(response.data.signed),
        );
      } catch (err) {
        if (isCancel(err)) return;
        if (!navigator.onLine) {
          const cached = localStorage.getItem(
            `signed_${user.uin}_${new Date().toISOString().split("T")[0]}`,
          );
          if (cached !== null) setHasSignedToday(JSON.parse(cached));
        }
      }
    },
    [user?.uin],
  );

  const getPlacementData = useCallback(
    async (signal) => {
      if (!user?.uin) return;
      try {
        const response = await axios.get("student/get_placement", {
          signal,
        });
        if (response.data.status === "success") {
          setPlacement(response.data.placement);
          localStorage.setItem(
            `placement_${user.uin}`,
            JSON.stringify(response.data.placement),
          );
        }
      } catch (err) {
        if (isCancel(err)) return;
        if (err.response?.status === 401) onLogout();
        else if (!navigator.onLine) {
          const cached = localStorage.getItem(`placement_${user.uin}`);
          if (cached) setPlacement(JSON.parse(cached));
        }
      } finally {
        setLoadingPlacement(false);
      }
    },
    [user?.uin, onLogout],
  );

  // 4. EFFECTS (Cache restore + API fetch merged)
  useEffect(() => {
    document.title = "TTFPP | Student Dashboard";
    const controller = new AbortController();

    if (user?.uin) {
      // Step 1: Restore from cache immediately
      const cachedPlacement = localStorage.getItem(`placement_${user.uin}`);
      if (cachedPlacement) {
        setPlacement(JSON.parse(cachedPlacement));
      }

      const today = new Date().toISOString().split("T")[0];
      const cachedSigned = localStorage.getItem(`signed_${user.uin}_${today}`);
      if (cachedSigned !== null) {
        setHasSignedToday(JSON.parse(cachedSigned));
      }

      // Step 2: Only fetch from API if online
      if (navigator.onLine) {
        checkStatus(controller.signal);
        getPlacementData(controller.signal);
      } else {
        setLoadingPlacement(false);
      }
    }

    return () => controller.abort();
  }, [user?.uin, checkStatus, getPlacementData]);

  // Offline Sync Effect
  useEffect(() => {
    const runSync = async () => {
      if (isSyncingRef.current || !navigator.onLine) return;

      // Throttle sync attempts: skip if less than 10 seconds since last attempt
      const timeSinceLastAttempt = Date.now() - lastSyncAttemptRef.current;
      if (timeSinceLastAttempt < 10000) return;

      lastSyncAttemptRef.current = Date.now();

      const pendingRaw = localStorage.getItem("pending_attendance");
      if (!pendingRaw) return;

      try {
        const pendingArray = JSON.parse(pendingRaw);
        if (pendingArray.length === 0) return; // Don't trigger if array is empty

        setIsSyncing(true);
        isSyncingRef.current = true;
        const result = await syncOfflineAttendance();

        if (result.success && result.count > 0) {
          setAttendanceStatus({
            message: `Synced ${result.count} records!`,
            type: "success",
          });
          checkStatus();
          // Clear local cache for this user specifically
          setTimeout(
            () => setAttendanceStatus({ message: "", type: "" }),
            4000,
          );
        }
      } catch (e) {
        console.error("Sync failed", e);
      } finally {
        setIsSyncing(false);
        isSyncingRef.current = false;
      }
    };

    window.addEventListener("online", runSync);
    runSync();
    return () => window.removeEventListener("online", runSync);
  }, [checkStatus]);

  // 5. EVENT HANDLERS
  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshGPS();
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const handleAttendance = () => {
    if (hasSignedToday) {
      setAttendanceStatus({
        message: "Attendance already recorded.",
        type: "info",
      });
      return;
    }
    if (
      location.lat &&
      location.lng &&
      placement?.coordinate_check !== false &&
      distance !== null &&
      !isInRange &&
      location.accuracy <= 100
    ) {
      setAttendanceStatus({
        message: `Too far away (${Math.round(distance)}m).`,
        type: "error",
      });
      return;
    }
    setAttendanceStatus({ message: "", type: "" });
    setIsModalOpen(true);
  };

  const confirmAttendanceSubmission = async () => {
    setIsSubmitting(true);

    // --- ANTI-SPOOFING LAYER ---
    const isMocked = location.isMocked || location.accuracy === 0;
    const isSuspiciouslyAccurate =
      location.accuracy > 0 && location.accuracy < 1; // Real GPS rarely has < 1m accuracy indoors/rural

    if (isMocked || isSuspiciouslyAccurate) {
      setAttendanceStatus({
        message:
          "Security Alert: Virtual/Mock location detected. Please use a physical device.",
        type: "error",
      });
      setIsSubmitting(false);
      return false;
    }
    // ---------------------------

    const progress = calculateProgramProgress(placement?.start_date);
    const data = {
      latitude: location.lat,
      longitude: location.lng,
      accuracy: location.accuracy, // Send accuracy to server for backend auditing
      is_mocked: location.is_mocked || location.accuracy === 0,
      user_id: user?.id || user?.user_id,
      enrollment_id: placement?.id,
      community_id: placement?.community_id,
      session_id: placement?.session_id,
      status: "present",
      week_number: progress.week,
      day_number: progress.day,
      captured_at: new Date().toISOString(),
      // Add a simple integrity hash (optional)
      device_id: localStorage.getItem("student_device_id"),
    };

    try {
      const resp = await axios.post("student/submit_attendance", data);
      if (resp.data.status === "success") {
        setHasSignedToday(true);
        setAttendanceStatus({
          message: "Verified successfully!",
          type: "success",
        });
        return true;
      }
      setAttendanceStatus({ message: resp.data.message, type: "error" });
      return false;
    } catch (err) {
      // If offline, we still save, but we mark it for manual review on the dashboard
      if (!err.response) {
        saveAttendanceOffline({ ...data, is_offline: true });
        setHasSignedToday(true);
        setAttendanceStatus({
          message: "Saved offline. Will sync later.",
          type: "info",
        });
        return true;
      }
      setAttendanceStatus({ message: "Submission failed", type: "error" });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullName = placement?.full_name || user?.name || "Student";

  return (
    <div style={styles.container}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />
      {isSyncing && (
        <div style={styles.syncOverlay}>
          <RefreshCw size={14} className="spin-animation" /> Syncing offline
          data...
        </div>
      )}
      <main style={styles.main}>
        <DashboardHero
          fullName={loadingPlacement ? "..." : fullName}
          academicLevel={loadingPlacement ? "..." : placement?.level || "N/A"}
          uin={user?.uin}
          role={user?.role}
          location={location}
          onAttendance={handleAttendance}
          isSubmitting={isSubmitting}
          status={attendanceStatus}
          isInRange={isInRange}
          distance={distance}
          buttonText={hasSignedToday ? "Submitted" : "Take Attendance "}
          buttonDisabled={hasSignedToday || isSubmitting}
          isCompleted={hasSignedToday}
        />

        <AttendanceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={confirmAttendanceSubmission}
          placement={placement}
          isSubmitting={isSubmitting}
          location={location}
        />

        <div style={styles.grid}>
          {/* Profile Card */}
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

          {/* Placement Card */}
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

          {/* Live Tracker Card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>
                <Navigation size={24} color="#0c0481" /> Live Tracker
              </h3>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
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
              {location.error ? (
                <div style={styles.errorBox}>{location.error}</div>
              ) : (
                <>
                  <p style={styles.sectionLabel}>Your Location:</p>
                  <div
                    style={{
                      ...styles.coordBox,
                      border: location.lat
                        ? "1px solid #94fc86"
                        : "1px solid #ffd700",
                    }}
                  >
                    <div>
                      <small style={styles.miniLabel}>LAT</small>
                      <br />
                      <strong style={styles.coordLabel1}>
                        {location.lat?.toFixed(6) || "Searching..."}
                      </strong>
                    </div>
                    <div style={styles.coordDivider}>
                      <small style={styles.miniLabel}>LNG</small>
                      <br />
                      <strong style={styles.coordLabel1}>
                        {location.lng?.toFixed(6) || "Searching..."}
                      </strong>
                    </div>
                  </div>
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
                      <code style={styles.coordLabel2}>
                        {parseFloat(placement?.community_lat || 0).toFixed(6)}
                      </code>
                    </div>
                    <div style={styles.coordDivider}>
                      <small style={styles.miniLabel}>TARGET LNG</small>
                      <br />
                      <code style={styles.coordLabel2}>
                        {parseFloat(placement?.community_lng || 0).toFixed(6)}
                      </code>
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

// ... keep your DetailRow and styles exactly as they were

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
    transition: "opacity 0.3s ease-in-out", // Smooth entry
  },
  syncOverlay: {
    position: "fixed",
    top: "70px",
    right: "20px",
    backgroundColor: "#1e293b",
    color: "white",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    zIndex: 1000,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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
  coordLabel1: {
    color: "#030303",
    fontWeight: "bold",
  },
  coordLabel2: {
    color: "#64748b",
    fontWeight: "bold",
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
    minHeight: "55px",
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
