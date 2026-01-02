import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Navbar from "./navBar";
import Footer from "./footer";
import AdminHeader from "./AdminHeader";
import axios from "../api/axios";
import StudentModal from "./StudentModal";
import CommunityModal from "./CommunityModal";
import AdminModal from "./AdminModal";
import StudentList from "./StudentList";
import CommunityList from "./CommunityList";
import AdminList from "./AdminList";
import RecentActivity from "./RecentActivity";
import AttendanceExportModal from "./AttendanceExportModal";
import SessionManager from "./SessionManager"; // The component we just finished

import {
  Users,
  MapPin,
  ShieldCheck,
  Activity,
  LayoutDashboard,
  GraduationCap,
  Map,
  Lock,
  Archive,
  CalendarDays, // New icon for sessions
} from "lucide-react";

const AdminDashboard = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    registered_students: 0,
    total_students: 0,
    total_communities: 0,
  });

  const [activeModal, setActiveModal] = useState(null);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/students")) return "students";
    if (path.includes("/communities")) return "communities";
    if (path.includes("/admins")) return "admins";
    if (path.includes("/sessions")) return "sessions";
    return "overview";
  };

  const handleAddAction = (actionType) => setActiveModal(actionType);
  const closeModal = () => setActiveModal(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/admin/stats");
      setStats(res.data?.stats || res.data);
    } catch (err) {
      console.error("Dashboard Load Failure:", err);
      setError("Failed to load metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#f0f2f5",
      width: "100vw",
    },
    main: {
      flex: 1,
      padding: "40px 5%",
      maxWidth: "1200px",
      margin: "0 auto",
      width: "100%",
    },
    topBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
    },
    actionGroup: { display: "flex", gap: "10px" },
    exportTriggerBtn: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#1e293b",
      color: "white",
      padding: "10px 16px",
      borderRadius: "8px",
      border: "none",
      fontWeight: "600",
      cursor: "pointer",
    },
    sessionBtn: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      backgroundColor: "#198104",
      color: "white",
      padding: "10px 16px",
      borderRadius: "8px",
      border: "none",
      fontWeight: "600",
      cursor: "pointer",
    },
    tabContainer: {
      display: "flex",
      gap: "20px",
      marginBottom: "25px",
      borderBottom: "1px solid #ddd",
      overflowX: "auto",
    },
    tab: {
      padding: "10px 15px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      textDecoration: "none",
      fontWeight: "600",
      color: "#64748b",
      borderBottom: "3px solid transparent",
      transition: "all 0.2s ease",
    },
    activeTab: { color: "#198104", borderBottom: "3px solid #198104" },
    statGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    statCard: {
      backgroundColor: "#ffffffff",
      padding: "20px",
      borderRadius: "12px",
      textAlign: "center",
      border: "none",
      boxShadow: "2px 2px 2px  rgba(3, 194, 18, 1)",
    },
    contentCard: {
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    },
  };

  const OverviewContent = () => (
    <>
      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <Users size={24} color="#198104" />
          <h3>
            {loading
              ? "..."
              : `${stats.registered_students}/${stats.total_students}`}
          </h3>
          <p>Registered Students</p>
          {error && <small style={{ color: "red" }}>{error}</small>}
        </div>
        <div style={styles.statCard}>
          <MapPin size={24} color="#198104" style={{ marginBottom: "10px" }} />
          <h3>{loading ? "..." : stats.total_communities || 0}</h3>
          <p>Communities</p>
        </div>
      </div>

      <div style={styles.contentCard}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          <Activity size={20} color="#666" />
          <h3 style={{ margin: 0 }}>Recent System Activity</h3>
        </div>
        {user?.admin_level === "super_admin" ? (
          <RecentActivity />
        ) : (
          <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
            <p>Activity logs are restricted to Super Administrators.</p>
          </div>
        )}
      </div>
    </>
  );

  const activeTabName = getActiveTab();

  return (
    <div style={styles.container}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />

      <main style={styles.main}>
        <div style={styles.topBar}>
          <h1 style={{ fontSize: "24px", color: "#1e293b", margin: 0 }}>
            SuperAdmin Control Panel
          </h1>
          <div style={styles.actionGroup}>
            {user?.admin_level === "super_admin" && (
              <button
                onClick={() => navigate("/admin/sessions")}
                style={styles.sessionBtn}
              >
                <CalendarDays size={18} /> Set Academic Session
              </button>
            )}
            <button
              onClick={() => setIsExportModalOpen(true)}
              style={styles.exportTriggerBtn}
            >
              <Archive size={18} /> Export Center
            </button>
          </div>
        </div>

        <header style={{ marginBottom: "20px" }}>
          <AdminHeader user={user} onAction={handleAddAction} />
        </header>

        <div style={styles.tabContainer}>
          <Link
            to="/admin"
            style={{
              ...styles.tab,
              ...(activeTabName === "overview" ? styles.activeTab : {}),
            }}
          >
            <LayoutDashboard size={18} /> Overview
          </Link>
          <Link
            to="/admin/students"
            style={{
              ...styles.tab,
              ...(activeTabName === "students" ? styles.activeTab : {}),
            }}
          >
            <GraduationCap size={18} /> Students
          </Link>
          <Link
            to="/admin/communities"
            style={{
              ...styles.tab,
              ...(activeTabName === "communities" ? styles.activeTab : {}),
            }}
          >
            <Map size={18} /> Communities
          </Link>
          {user?.admin_level === "super_admin" && (
            <>
              <Link
                to="/admin/sessions"
                style={{
                  ...styles.tab,
                  ...(activeTabName === "sessions" ? styles.activeTab : {}),
                }}
              >
                <CalendarDays size={18} /> Sessions
              </Link>
              <Link
                to="/admin/admins"
                style={{
                  ...styles.tab,
                  ...(activeTabName === "admins" ? styles.activeTab : {}),
                }}
              >
                <Lock size={18} /> System Admins
              </Link>
            </>
          )}
        </div>

        <Routes>
          <Route path="/" element={<OverviewContent />} />
          <Route
            path="/students"
            element={
              <div style={styles.contentCard}>
                <StudentList />
              </div>
            }
          />
          <Route
            path="/communities"
            element={
              <div style={styles.contentCard}>
                <div style={{ marginBottom: "20px" }}>
                  <h3 style={{ margin: 0 }}>Community Map Registry</h3>
                  <p style={{ color: "#666", fontSize: "14px" }}>
                    Manage deployment locations.
                  </p>
                </div>
                <CommunityList />
              </div>
            }
          />
          {user?.admin_level === "super_admin" && (
            <>
              <Route
                path="/admins"
                element={
                  <div style={styles.contentCard}>
                    <AdminList />
                  </div>
                }
              />
              <Route path="/sessions" element={<SessionManager />} />
            </>
          )}
        </Routes>

        <StudentModal
          isOpen={activeModal === "student"}
          onClose={closeModal}
          onRefresh={fetchStats}
        />
        <CommunityModal
          isOpen={activeModal === "community"}
          onClose={closeModal}
          onRefresh={fetchStats}
        />
        <AdminModal
          isOpen={activeModal === "admin"}
          onClose={closeModal}
          onRefresh={fetchStats}
        />
        <AttendanceExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
