import React, { useState, useEffect, useCallback } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Navbar from "./navbar";
import Footer from "./footer";
import AdminHeader from "./AdminHeader";
import useAdminStats from "../hooks/useAdminStats";
import StudentModal from "./StudentModal";
import CommunityModal from "./CommunityModal";
import AdminModal from "./AdminModal";
import AttendanceExportModal from "./AttendanceExportModal";
import StudentList from "./StudentList";
import CommunityList from "./CommunityList";
import AdminList from "./AdminList";
import RecentActivity from "./RecentActivity";
import SessionManager from "./SessionManager";

import {
  Users,
  MapPin,
  Activity,
  LayoutDashboard,
  GraduationCap,
  Map,
  Lock,
  Archive,
  CalendarDays,
  Loader2,
} from "lucide-react";

/* ===================== STYLES ===================== */

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f0f2f5",
    width: "100%",
  },
  main: {
    flex: 1,
    padding: "40px 5%",
    maxWidth: "1200px",
    margin: "0 auto",
    width: "100%",
    position: "relative",
  },
  refreshIndicator: {
    position: "fixed",
    top: "20px",
    right: "20px",
    backgroundColor: "rgba(25, 129, 4, 0.95)",
    color: "white",
    padding: "10px 16px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: "600",
    zIndex: 1000,
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
  },
  tab: {
    padding: "10px 15px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none",
    fontWeight: "600",
    color: "#64748b",
    borderBottom: "3px solid transparent",
  },
  activeTab: { color: "#198104", borderBottom: "3px solid #198104" },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center",
    boxShadow: "2px 2px 2px rgba(3, 194, 18, 1)",
  },
  contentCard: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
  },
};

/* ===================== OVERVIEW ===================== */

const OverviewContent = ({ stats, error, user }) => (
  <>
    <div style={styles.statGrid}>
      <div style={styles.statCard}>
        <Users size={24} color="#198104" />
        <h3>{`${stats.registered_students}/${stats.total_students}`}</h3>
        <p>Registered Students</p>
        {error && <small style={{ color: "red" }}>{error}</small>}
      </div>

      <div style={styles.statCard}>
        <MapPin size={24} color="#198104" />
        <h3>{stats.total_communities}</h3>
        <p>Communities</p>
      </div>
    </div>

    <div style={styles.contentCard}>
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <Activity size={20} />
        <h3 style={{ margin: 0 }}>Recent System Activity</h3>
      </div>

      {user?.admin_level === "super_admin" ? (
        <RecentActivity />
      ) : (
        <p style={{ color: "#666", textAlign: "center" }}>
          Activity logs are restricted to Super Administrators.
        </p>
      )}
    </div>
  </>
);

/* ===================== DASHBOARD (NO MODALS) ===================== */

const AdminDashboard = ({ user, onLogout, onOpenModal, onOpenExport }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const { stats, isRefreshing, error } = useAdminStats();

  const getActiveTab = () => {
    const p = location.pathname;
    if (p.includes("/students")) return "students";
    if (p.includes("/communities")) return "communities";
    if (p.includes("/admins")) return "admins";
    if (p.includes("/sessions")) return "sessions";
    return "overview";
  };
  useEffect(() => {
    document.title = "TTFPP | Admin Dashboard";
  }, []);
  const activeTab = getActiveTab();

  return (
    <div style={styles.container}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />

      {isRefreshing && (
        <div style={styles.refreshIndicator}>
          <Loader2 size={16} className="animate-spin" />
          Updating…
        </div>
      )}

      <main style={styles.main}>
        <div style={styles.topBar}>
          <h1>
            {user?.admin_level === "super_admin" ? "Super Admin" : "Admin"}{" "}
            Control Panel
          </h1>

          <div style={styles.actionGroup}>
            {user?.admin_level === "super_admin" && (
              <button
                style={styles.sessionBtn}
                onClick={() => navigate("/admin/sessions")}
              >
                <CalendarDays size={18} /> Set Session
              </button>
            )}

            <button style={styles.exportTriggerBtn} onClick={onOpenExport}>
              <Archive size={18} /> Export Center
            </button>
          </div>
        </div>

        <AdminHeader user={user} onAction={onOpenModal} />

        <div style={styles.tabContainer}>
          <Link
            to="/admin"
            style={{
              ...styles.tab,
              ...(activeTab === "overview" && styles.activeTab),
            }}
          >
            <LayoutDashboard size={18} /> Overview
          </Link>
          <Link
            to="/admin/students"
            style={{
              ...styles.tab,
              ...(activeTab === "students" && styles.activeTab),
            }}
          >
            <GraduationCap size={18} /> Students
          </Link>
          <Link
            to="/admin/communities"
            style={{
              ...styles.tab,
              ...(activeTab === "communities" && styles.activeTab),
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
                  ...(activeTab === "sessions" && styles.activeTab),
                }}
              >
                <CalendarDays size={18} /> Sessions
              </Link>
              <Link
                to="/admin/admins"
                style={{
                  ...styles.tab,
                  ...(activeTab === "admins" && styles.activeTab),
                }}
              >
                <Lock size={18} /> System Admins
              </Link>
            </>
          )}
        </div>

        <Routes>
          <Route
            index
            element={
              <OverviewContent stats={stats} error={error} user={user} />
            }
          />
          <Route path="students" element={<StudentList />} />
          <Route path="communities" element={<CommunityList />} />
          {user?.admin_level === "super_admin" && (
            <>
              <Route path="admins" element={<AdminList />} />
              <Route path="sessions" element={<SessionManager />} />
            </>
          )}
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

const AdminShell = ({ user, onLogout }) => {
  // 1. Remove useRef. Use ONLY state for UI.
  // State is preserved across re-renders; Ref values can be inconsistent during render.
  const [activeModal, setActiveModal] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  // 2. Memoize these handlers.
  // This prevents the AdminDashboard from thinking its props changed.
  const openExport = useCallback(() => setExportOpen(true), []);
  const closeExport = useCallback(() => setExportOpen(false), []);

  const openModal = useCallback((type) => {
    setActiveModal(type);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  return (
    <>
      <AdminDashboard
        user={user}
        onLogout={onLogout}
        onOpenModal={openModal}
        onOpenExport={openExport}
      />

      {/* 3. Direct state comparison. No more .current checks */}
      {activeModal === "student" && (
        <StudentModal isOpen={true} onClose={closeModal} />
      )}

      {activeModal === "community" && (
        <CommunityModal isOpen={true} onClose={closeModal} />
      )}

      {activeModal === "admin" && (
        <AdminModal isOpen={true} onClose={closeModal} />
      )}

      {exportOpen && (
        <AttendanceExportModal isOpen={true} onClose={closeExport} />
      )}
    </>
  );
};
export default AdminShell;
