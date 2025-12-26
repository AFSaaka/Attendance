import React, { useState, useEffect } from "react";
import { Users, MapPin, ShieldAlert } from "lucide-react";
import Navbar from "./navBar";
import Footer from "./footer";
import SummaryCard from "./SummaryCard";
import AttendanceTable from "./AttendanceTable";
import CoordinatorInfo from "./CoordinatorInfo";
import axios from "../api/axios";

const CoordinatorDashboard = ({ user, onLogout }) => {
  const [data, setData] = useState({ stats: {}, audit: [] });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        /** * FIX 1: Point to the specific .php files
         * FIX 2: Added 'withCredentials: true' to ensure PHP sessions work
         */
        const [profileRes, dashboardRes] = await Promise.all([
          axios.get("/auth/me", { withCredentials: true }),
          axios.get("/coordinator/audit-summary", {
            withCredentials: true,
          }),
        ]);

        setProfile(profileRes.data);
        setData(dashboardRes.data);
      } catch (err) {
        console.error("Dashboard Sync Error:", err);
        // If the PHP session expired (401), log the user out automatically
        if (err.response?.status === 401) {
          console.warn("Session lost or not sent. Check withCredentials.");
          onLogout();
        } else {
          setError(
            "Failed to synchronize dashboard data. Please check your connection."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [onLogout]);

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} style={styles.btnPri}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.layout}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />

      <main style={styles.main}>
        <div style={styles.contentWrapper}>
          <header style={styles.header}>
            <div style={styles.herodiv}>
              {/* This component will now receive the full data from your PHP JOIN query */}
              {profile && <CoordinatorInfo profile={profile} />}
            </div>
          </header>

          <div style={styles.gridStats}>
            <SummaryCard
              title="Assigned Students"
              value={data?.stats?.total ?? 0}
              icon={Users}
              color="#0c0481"
            />
            <SummaryCard
              title="Active"
              value={data?.stats?.active ?? 0}
              icon={MapPin}
              color="#16a34a"
            />
            <SummaryCard
              title="Discrepancies"
              value={data?.stats?.alerts ?? 0}
              icon={ShieldAlert}
              color="#dc2626"
            />
          </div>

          <div style={styles.contentSection}>
            <h3 style={styles.sectionTitle}>Real-time Location Audit</h3>
            <AttendanceTable data={data.audit} loading={loading} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const styles = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f8fafc",
    width: "100%", // Force container to edges
  },
  herodiv: {
    width: "100%",
  },
  main: {
    flex: 1,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center", // Keeps the wrapper centered on ultra-wide screens
  },
  contentWrapper: {
    width: "100%",
    /* padding: Top/Bottom 40px, Left/Right Fluid. 
       This removes the "5%" bottleneck and scales with screen size. 
    */
    padding: "40px clamp(15px, 3vw, 50px)",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "35px",
    width: "100%",
  },
  gridStats: {
    display: "grid",
    /* minmax(300px, 1fr) ensures that if there is space, 
       the cards will GROW to fill it. 
    */
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "25px",
    marginBottom: "40px",
    width: "100%",
  },
  actionGroup: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap", // Ensures buttons wrap on mobile
  },

  contentSection: {
    background: "#ffffff",
    padding: "30px",
    borderRadius: "20px",
    boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)",

    /* FIX: Controlled width and Centering */
    width: "100%", // Full width on mobile
    maxWidth: "1000px", // Limits width on large screens (approx 50-60%)
    margin: "0 auto", // Centers the box horizontally
    boxSizing: "border-box",
  },

  // Make sure the title centers too if you want the whole "block" centered
  sectionTitle: {
    marginTop: 0,
    marginBottom: "25px",
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center", // Centers the text within the 900px box
  },
};

export default CoordinatorDashboard;
