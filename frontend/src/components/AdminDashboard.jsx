import React from "react";
import Navbar from "./navBar";
import Footer from "./footer";

const AdminDashboard = ({ user, onLogout }) => {
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
        <header style={{ marginBottom: "30px" }}>
          <h1 style={{ color: "#198104" }}>System Administrator</h1>
          <p>Global TTFPP Oversight | {user?.admin_level}</p>
        </header>

        <div style={styles.statGrid}>
          <div style={styles.statCard}>
            <h3>1,240</h3>
            <p>Total Students</p>
          </div>
          <div style={styles.statCard}>
            <h3>45</h3>
            <p>Communities</p>
          </div>
          <div style={styles.statCard}>
            <h3>12</h3>
            <p>Coordinators</p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "12px",
          }}
        >
          <h3>Recent System Activity</h3>
          <p style={{ color: "#666" }}>Logs will appear here...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
