import React from "react";
import Navbar from "./navBar";
import Footer from "./footer";

const CoordinatorDashboard = ({ user, onLogout }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f4f7f6",
        width: "100vw",
      }}
    >
      <Navbar onLogout={onLogout} userEmail={user?.email} />
      <main style={{ flex: 1, padding: "40px 5%" }}>
        <h1 style={{ color: "#0c0481" }}>Coordinator Dashboard</h1>
        <p>Managing Assigned Communities</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h3>Quick Actions</h3>
            <button
              style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            >
              Approve Attendance
            </button>
            <button style={{ width: "100%", padding: "10px" }}>
              Generate Report
            </button>
          </div>
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
            }}
          >
            <h3>Flagged Discrepancies</h3>
            <p style={{ fontSize: "14px", color: "#777" }}>
              No location mismatches reported today.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CoordinatorDashboard;
