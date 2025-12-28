import React, { useState, useEffect } from "react";
import Navbar from "./navBar";
import Footer from "./footer";
import AdminHeader from "./AdminHeader";
import axios from "../api/axios";
import StudentModal from "./StudentModal";
import CoordinatorModal from "./CoordinatorModal";
import { Users, MapPin, ShieldCheck, Activity } from "lucide-react";

const AdminDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    students: 0,
    communities: 0,
    coordinators: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  const handleAddAction = (actionType) => {
    setActiveModal(actionType); // This replaces the alert
  };

  const closeModal = () => setActiveModal(null);

  const fetchStats = () => {
    setLoading(true);
    axios
      .get("/admin/stats")
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Admin Stats Error:", err);
        setLoading(false);
      });
  };

  // 2. Update your useEffect to use it
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
  };

  return (
    <div style={styles.container}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />
      <main style={styles.main}>
        <header style={{ marginBottom: "20px" }}>
          <AdminHeader user={user} onAction={handleAddAction} />
        </header>
        <StudentModal
          isOpen={activeModal === "student"}
          onClose={closeModal}
          onRefresh={() => {
            // Logic to re-fetch your counts from the database
            console.log("Refreshing stats...");
          }}
        />
        <CoordinatorModal
          isOpen={activeModal === "coordinator"}
          onClose={closeModal}
          onRefresh={fetchStats}
        />
        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <Users size={24} color="#198104" style={{ marginBottom: "10px" }} />
            <h3>{loading ? "..." : stats.students.toLocaleString()}</h3>
            <p>Total Students</p>
          </div>
          <div style={styles.statCard}>
            <MapPin
              size={24}
              color="#198104"
              style={{ marginBottom: "10px" }}
            />
            <h3>{loading ? "..." : stats.communities}</h3>
            <p>Communities</p>
          </div>
          <div style={styles.statCard}>
            <ShieldCheck
              size={24}
              color="#198104"
              style={{ marginBottom: "10px" }}
            />
            <h3>{loading ? "..." : stats.coordinators}</h3>
            <p>Coordinators</p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
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
          <p style={{ color: "#666" }}>Logs will appear here...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
