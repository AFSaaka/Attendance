import React, { useState, useEffect } from "react";
import Navbar from "./navBar";
import Footer from "./footer";

const StudentDashboard = ({ user, onLogout }) => {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    error: null,
  });

  // Fetch location on component mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, error: "Geolocation not supported" }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
        }),
      (err) =>
        setLocation((prev) => ({ ...prev, error: "Location access denied" }))
    );
  }, []);

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#f4f7f6",
      width: "100vw",
    },

    main: {
      flex: 1,
      padding: "40px 5%",
      maxWidth: "1200px",
      margin: "0 auto",
      width: "100%",
    },
    welcomeHero: {
      backgroundColor: "#198104",
      color: "white",
      padding: "30px",
      borderRadius: "15px",
      marginBottom: "30px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "20px",
    },
    card: {
      backgroundColor: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
    },
  };

  return (
    <div style={styles.container}>
      <Navbar onLogout={onLogout} userEmail={user?.email} />
      <main style={styles.main}>
        {/* Hero Section */}
        <section style={styles.welcomeHero}>
          <h1 style={{ margin: 0 }}>Welcome back!</h1>
          <p style={{ opacity: 0.9 }}>
            UIN: {user?.uin} | Role: {user?.role}
          </p>
        </section>

        <div style={styles.grid}>
          {/* Profile Quick View */}
          <div style={styles.card}>
            <h3>👤 Account Details</h3>
            <hr style={{ border: "0.5px solid #eee" }} />
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Account Status:</strong>{" "}
              <span style={{ color: "green" }}>Verified</span>
            </p>
          </div>
          {/* Location Card */}
          <div style={styles.card}>
            <h3>📍 Current Location</h3>
            <hr style={{ border: "0.5px solid #eee" }} />
            {location.error ? (
              <p style={{ color: "red" }}>{location.error}</p>
            ) : location.lat ? (
              <div>
                <p>
                  <strong>Latitude:</strong> {location.lat.toFixed(4)}
                </p>
                <p>
                  <strong>Longitude:</strong> {location.lng.toFixed(4)}
                </p>
                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "#e8f5e9",
                    borderRadius: "5px",
                    marginTop: "10px",
                  }}
                >
                  <small style={{ color: "#2e7d32" }}>
                    Status: GPS Signal Active
                  </small>
                </div>
              </div>
            ) : (
              <p>Fetching GPS coordinates...</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StudentDashboard;
