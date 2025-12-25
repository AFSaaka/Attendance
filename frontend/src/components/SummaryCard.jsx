import React from "react";

const SummaryCard = ({ title, value, icon: Icon, color }) => (
  <div style={{ ...styles.card, borderLeft: `5px solid ${color}` }}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <p style={styles.label}>{title}</p>
        <h2 style={styles.value}>{value}</h2>
      </div>
      <div style={{ color: color, opacity: 0.8 }}>
        <Icon size={32} />
      </div>
    </div>
  </div>
);

const styles = {
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  },
  label: { color: "#64748b", margin: 0, fontSize: "14px", fontWeight: "600" },
  value: { margin: "5px 0 0 0", color: "#1e293b", fontSize: "24px" },
};

export default SummaryCard;
