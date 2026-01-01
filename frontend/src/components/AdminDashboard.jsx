import React, { useState, useEffect } from "react";
import Navbar from "./navBar";
import Footer from "./footer";
import AdminHeader from "./AdminHeader";
import axios from "../api/axios";
import StudentModal from "./StudentModal";
import CoordinatorModal from "./CoordinatorModal";
import CommunityModal from "./CommunityModal";
import AdminModal from "./AdminModal";
import CoordinatorList from "./CoordinatorList";
import StudentList from "./StudentList";
import CommunityList from "./CommunityList";
import AdminList from "./AdminList";
import RecentActivity from "./RecentActivity";
import AttendanceExportModal from "./AttendanceExportModal";
import {
  Users,
  MapPin,
  ShieldCheck,
  Activity,
  LayoutDashboard,
  UserCog,
  GraduationCap,
  Map,
  Lock, // Icon for Admin tab
  Archive,
} from "lucide-react";

const AdminDashboard = ({ user, onLogout }) => {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    registered_students: 0,
    total_students: 0,
    total_communities: 0,
    active_coordinators: 0,
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [activeModal, setActiveModal] = useState(null);
  const handleAddAction = (actionType) => setActiveModal(actionType);
  const closeModal = () => setActiveModal(null);
  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/admin/stats");
      // Check for the production structure: res.data.stats
      if (res.data && res.data.stats) {
        setStats(res.data.stats);
      } else if (res.data && !res.data.stats) {
        // Fallback if your PHP isn't nesting under 'stats' yet
        setStats(res.data);
      }
    } catch (err) {
      console.error("Dashboard Load Failure:", err);
      setError("Failed to load metrics. Please refresh.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchStats();
  }, []);
  const renderStat = (value) =>
    loading ? "..." : value?.toLocaleString() || 0;
  const styles = {
    topBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      padding: "0 10px",
    },

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
      transition: "background 0.2s",
    },

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
      border: "none",
      background: "none",
      fontWeight: "600",
      color: "#64748b",
      borderBottom: "3px solid transparent",
      transition: "all 0.2s ease",
      whiteSpace: "nowrap",
    },
    activeTab: { color: "#198104", borderBottom: "3px solid #198104" },
    statGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    statCard: {
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "12px",
      textAlign: "center",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    },
    contentCard: {
      backgroundColor: "#fff",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    },
  };

  return (
    <div style={styles.container}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />

      <main style={styles.main}>
        {/* Combine AdminHeader and the Title/Export Bar for a cleaner look */}
        <div style={styles.topBar}>
          <h1 style={{ fontSize: "24px", color: "#1e293b", margin: 0 }}>
            SuperAdmin Control Panel
          </h1>

          <button
            onClick={() => setIsExportModalOpen(true)}
            style={styles.exportTriggerBtn}
          >
            <Archive size={18} />
            Export Center
          </button>
        </div>

        <header style={{ marginBottom: "20px" }}>
          <AdminHeader user={user} onAction={handleAddAction} />
        </header>

        {/* Navigation Tabs */}
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "overview" ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab("overview")}
          >
            <LayoutDashboard size={18} /> Overview
          </button>

          <button
            style={{
              ...styles.tab,
              ...(activeTab === "students" ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab("students")}
          >
            <GraduationCap size={18} /> Students
          </button>

          <button
            style={{
              ...styles.tab,
              ...(activeTab === "communities" ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab("communities")}
          >
            <Map size={18} /> Communities
          </button>

          <button
            style={{
              ...styles.tab,
              ...(activeTab === "coordinators" ? styles.activeTab : {}),
            }}
            onClick={() => setActiveTab("coordinators")}
          >
            <UserCog size={18} /> Coordinators
          </button>

          {/* NEW ADMIN TAB - Only visible to Super Admins if you want to restrict it */}
          {user?.admin_level === "super_admin" && (
            <button
              style={{
                ...styles.tab,
                ...(activeTab === "admins" ? styles.activeTab : {}),
              }}
              onClick={() => setActiveTab("admins")}
            >
              <Lock size={18} /> System Admins
            </button>
          )}
        </div>

        {/* Modals */}
        <StudentModal
          isOpen={activeModal === "student"}
          onClose={closeModal}
          onRefresh={fetchStats}
        />
        <CoordinatorModal
          isOpen={activeModal === "coordinator"}
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

        {/* Tab Content */}
        {activeTab === "overview" && (
          <>
            <div style={styles.statGrid}>
              {/* 1. Student Card */}
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

              {/* 2. Coordinator Card */}
              <div style={styles.statCard}>
                <ShieldCheck
                  size={24}
                  color="#198104"
                  style={{ marginBottom: "10px" }}
                />
                <h3>{loading ? "..." : stats.active_coordinators || 0}</h3>
                <p>Coordinators</p>
              </div>

              {/* 3. Communities Card */}
              <div style={styles.statCard}>
                <MapPin
                  size={24}
                  color="#198104"
                  style={{ marginBottom: "10px" }}
                />
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
              {/* SECURITY: Only show content to superadmins */}
              {user?.admin_level === "super_admin" ? (
                <RecentActivity />
              ) : (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#666",
                  }}
                >
                  <p>Activity logs are restricted to Super Administrators.</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "students" && (
          <div style={styles.contentCard}>
            <StudentList />
          </div>
        )}

        {activeTab === "communities" && (
          <div style={styles.contentCard}>
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Community Map Registry</h3>
              <p style={{ color: "#666", fontSize: "14px" }}>
                Manage deployment locations and spatial coordinates.
              </p>
            </div>
            <CommunityList />
          </div>
        )}

        {activeTab === "coordinators" && (
          <div style={styles.contentCard}>
            <CoordinatorList />
          </div>
        )}

        {/* NEW ADMIN CONTENT */}
        {activeTab === "admins" && user?.admin_level === "super_admin" && (
          <div style={styles.contentCard}>
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Administrator Registry</h3>
              <p style={{ color: "#666", fontSize: "14px" }}>
                Manage system access and permission levels.
              </p>
            </div>
            {/* AdminList component goes here */}
            <AdminList />
          </div>
        )}
        {/* The Modal Component */}
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
