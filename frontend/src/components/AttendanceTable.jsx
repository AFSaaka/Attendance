import React, { useState, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock, // Added missing import
  XCircle, // Added missing import
  ChevronDown,
  ChevronRight,
  Search,
  X,
} from "lucide-react";

const AttendanceTable = ({ data = [], loading }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCommunities, setExpandedCommunities] = useState({});

  const groupedData = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    const term = searchTerm.toLowerCase();

    return safeData.reduce((acc, student) => {
      const community = student.community || "Other Locations";
      const matchesSearch =
        student.student_name.toLowerCase().includes(term) ||
        student.index_number.toLowerCase().includes(term) ||
        community.toLowerCase().includes(term);

      if (matchesSearch) {
        if (!acc[community]) acc[community] = [];
        acc[community].push(student);
      }
      return acc;
    }, {});
  }, [data, searchTerm]);

  const toggleCommunity = (name) => {
    setExpandedCommunities((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const clearSearch = () => {
    setSearchTerm("");
    setExpandedCommunities({});
  };

  if (loading)
    return <p style={{ padding: "20px" }}>Analyzing spatial records...</p>;

  return (
    <div style={styles.wrapper}>
      <div style={styles.searchBar}>
        <Search size={18} style={{ color: "#94a3b8" }} />
        <input
          type="text"
          placeholder="Search student, index number, or community..."
          style={styles.input}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <X
            size={18}
            style={{ color: "#94a3b8", cursor: "pointer" }}
            onClick={clearSearch}
          />
        )}
      </div>

      <div style={styles.container}>
        {Object.entries(groupedData).length === 0 && searchTerm && (
          <div
            style={{ padding: "20px", textAlign: "center", color: "#64748b" }}
          >
            No results found for "{searchTerm}"
          </div>
        )}

        {Object.entries(groupedData).map(([community, students]) => {
          const isExpanded =
            searchTerm.length > 0 || expandedCommunities[community];
          const alertCount = students.filter(
            (s) => s.distance > 200 && s.status !== "not yet"
          ).length;

          return (
            <div key={community} style={styles.section}>
              <div
                style={{
                  ...styles.communityHeader,
                  borderLeft:
                    alertCount > 0 ? "4px solid #dc2626" : "4px solid #16a34a",
                }}
                onClick={() => toggleCommunity(community)}
              >
                <div style={styles.headerLeft}>
                  {isExpanded ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                  <span style={styles.communityName}>{community}</span>
                  <span style={styles.badge}>{students.length} Students</span>
                </div>
                {alertCount > 0 && (
                  <span style={styles.alertBadge}>{alertCount} Off-Site</span>
                )}
              </div>

              {isExpanded && (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.headerRow}>
                        <th style={styles.th}>Student</th>
                        <th style={styles.th}>Distance</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((item) => (
                        <tr key={item.index_number} style={styles.row}>
                          <td style={styles.td}>
                            <strong>{item.student_name}</strong>
                            <div style={styles.subText}>
                              {item.index_number}
                            </div>
                          </td>
                          <td style={styles.td}>
                            {/* Improved Distance display logic */}
                            {item.status === "not yet"
                              ? "—"
                              : `${Number(item.distance || 0).toFixed(0)}m`}
                          </td>
                          <td style={styles.td}>
                            {/* FIXED: Passing both status and distance */}
                            <StatusBadge
                              status={item.status}
                              distance={item.distance}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatusBadge = ({ status, distance }) => {
  if (status === "not yet") {
    return (
      <span
        style={{
          ...styles.badgeBase,
          backgroundColor: "#f1f5f9",
          color: "#64748b",
        }}
      >
        <Clock size={14} /> Not Yet
      </span>
    );
  }

  if (status === "absent") {
    return (
      <span
        style={{
          ...styles.badgeBase,
          backgroundColor: "#fee2e2",
          color: "#991b1b",
        }}
      >
        <XCircle size={14} /> Absent
      </span>
    );
  }

  const isOffSite = distance > 200;
  return (
    <span
      style={{
        ...styles.badgeBase,
        backgroundColor: isOffSite ? "#fee2e2" : "#dcfce7",
        color: isOffSite ? "#991b1b" : "#166534",
      }}
    >
      {isOffSite ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
      {isOffSite ? "Off-Site" : "On-Site"}
    </span>
  );
};

const styles = {
  wrapper: { display: "flex", flexDirection: "column", gap: "15px" },
  badgeBase: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fff",
    padding: "10px 15px",
    borderRadius: "8px",
    border: "1px solid #35f804ff",
    position: "sticky",
    top: "0",
    zIndex: 10,
  },
  input: { border: "none", outline: "none", width: "100%", fontSize: "14px" },
  section: {
    background: "#fff",
    borderRadius: "8px",
    marginBottom: "8px",
    overflow: "hidden",
    border: "1px solid #f1f5f9",
  },
  communityHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 15px",
    cursor: "pointer",
    background: "#fff",
  },
  headerLeft: { display: "flex", alignItems: "center" },
  communityName: { fontWeight: "600", color: "#1e293b", marginLeft: "8px" },
  badge: {
    fontSize: "12px",
    color: "#64748b",
    background: "#f1f5f9",
    padding: "2px 8px",
    borderRadius: "12px",
    marginLeft: "10px",
  },
  alertBadge: {
    fontSize: "11px",
    color: "#fff",
    background: "#dc2626",
    padding: "2px 8px",
    borderRadius: "12px",
    fontWeight: "bold",
  },
  tableWrapper: { borderTop: "1px solid #f1f5f9" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  headerRow: { background: "#f8fafc", textAlign: "left", color: "#64748b" },
  th: { padding: "10px 15px" },
  row: { borderBottom: "1px solid #f8fafc" },
  td: { padding: "10px 15px" },
  subText: { fontSize: "11px", color: "#94a3b8" },
};

export default AttendanceTable;
