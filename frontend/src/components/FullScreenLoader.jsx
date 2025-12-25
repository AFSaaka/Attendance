import React from "react";

const FullScreenLoader = () => {
  return (
    <div style={styles.container}>
      {/* A simple CSS spinner */}
      <div style={styles.spinner}></div>
      <p style={styles.text}>Securing Session...</p>

      {/* The animation logic */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100vw",
    height: "100vh",
    backgroundColor: "#f8fafc",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 10000,
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #198104", // Your UDS green
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  text: {
    marginTop: "20px",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "sans-serif",
  },
};

export default FullScreenLoader;
