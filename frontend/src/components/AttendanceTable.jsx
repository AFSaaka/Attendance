import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

const AttendanceTable = ({ data = [], loading }) => {
  if (loading)
    return <p style={{ padding: "20px" }}>Updating spatial data...</p>;

  // 1. Force array and Group by community
  const safeData = Array.isArray(data) ? data : [];

  const groupedData = safeData.reduce((acc, student) => {
    const community = student.community || "Other Locations";
    if (!acc[community]) acc[community] = [];
    acc[community].push(student);
    return acc;
  }, {});

  if (safeData.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        No student data found for this district.
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {Object.entries(groupedData).map(([community, students]) => (
        <div key={community} style={styles.communitySection}>
          <h4 style={styles.communityHeader}>
            {community} ({students.length})
          </h4>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Student / Index No.</th>
                <th style={styles.th}>Distance</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((item) => {
                const distance = item.distance ?? 0;
                return (
                  <tr
                    key={item.index_number || Math.random()}
                    style={styles.row}
                  >
                    <td style={styles.td}>
                      <strong>{item.student_name}</strong>
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        ID: {item.index_number}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {distance > 1000
                        ? `${(distance / 1000).toFixed(1)}km`
                        : `${Number(distance).toFixed(0)}m`}
                    </td>
                    <td style={styles.td}>
                      <StatusBadge distance={distance} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

// StatusBadge component remains the same...

const StatusBadge = ({ distance }) => {
  const isOut = distance > 200; // 200m Threshold
  return (
    <span
      style={{
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "bold",
        backgroundColor: isOut ? "#fee2e2" : "#dcfce7",
        color: isOut ? "#991b1b" : "#166534",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {isOut ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
      {isOut ? "Off-Site" : "On-Site"}
    </span>
  );
};

const styles = {
  container: { background: "transparent" }, // Changed to transparent for sectioning
  communitySection: {
    marginBottom: "30px",
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  communityHeader: {
    padding: "15px 20px",
    margin: 0,
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    color: "#138104ff",
    fontSize: "1rem",
    fontWeight: "700",
  },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  headerRow: { borderBottom: "1px solid #f1f5f9", color: "#64748b" },
  row: { borderBottom: "1px solid #f1f5f9" },
  th: { padding: "12px 20px", fontSize: "13px", textTransform: "uppercase" },
  td: { padding: "12px 20px", fontSize: "14px" },
};
export default AttendanceTable;
