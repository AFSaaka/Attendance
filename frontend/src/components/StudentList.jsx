import React, { useEffect, useState, useMemo } from "react";
import {
  GraduationCap,
  MapPin,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Search,
  Users,
  Power,
  PowerOff,
} from "lucide-react";
import axios from "../api/axios";

const StudentList = () => {
  const [rawData, setRawData] = useState([]);
  const [expandedSections, setExpandedSections] = useState({}); // Keyed by path: "Region" or "Region-District"
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchStudents = async () => {
    try {
      const res = await axios.get("/admin/get-students");
      setRawData(res.data);
    } catch (err) {
      console.error("Fetch students error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // 1. NESTED GROUPING LOGIC (Region > District > Community)
  const groupedData = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();

    return rawData
      .filter(
        (s) =>
          s.full_name?.toLowerCase().includes(lowerSearch) ||
          s.index_number?.toLowerCase().includes(lowerSearch) ||
          s.district?.toLowerCase().includes(lowerSearch) ||
          s.community?.toLowerCase().includes(lowerSearch)
      )
      .reduce((acc, s) => {
        const r = s.region || "Unknown Region";
        const d = s.district || "Unknown District";
        const c = s.community || "Unknown Community";

        if (!acc[r]) acc[r] = {};
        if (!acc[r][d]) acc[r][d] = {};
        if (!acc[r][d][c]) acc[r][d][c] = [];

        acc[r][d][c].push(s);
        return acc;
      }, {});
  }, [rawData, searchTerm]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <div style={styles.loading}>Loading database...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.searchBarWrapper}>
        <div style={styles.searchInner}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search by Name, Index, District, or Community..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={styles.stats}>
          <Users size={16} />
          <span>Total: {rawData.length}</span>
        </div>
      </div>

      {Object.keys(groupedData).length === 0 ? (
        <div style={styles.noResults}>
          No students found matching "{searchTerm}"
        </div>
      ) : (
        Object.entries(groupedData).map(([region, districts]) => (
          <div key={region} style={styles.regionSection}>
            {/* REGION LEVEL */}
            <div
              style={styles.regionHeader}
              onClick={() => toggleSection(region)}
            >
              {expandedSections[region] || searchTerm ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
              <MapPin size={16} color="#198104" />
              <span style={{ fontWeight: "800" }}>{region}</span>
            </div>

            {(expandedSections[region] || searchTerm) &&
              Object.entries(districts).map(([district, communities]) => (
                <div key={district} style={styles.districtBlock}>
                  {/* DISTRICT LEVEL */}
                  <div
                    style={styles.districtHeader}
                    onClick={() => toggleSection(`${region}-${district}`)}
                  >
                    {expandedSections[`${region}-${district}`] || searchTerm ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    <span>
                      District: <strong>{district}</strong>
                    </span>
                  </div>

                  {(expandedSections[`${region}-${district}`] || searchTerm) &&
                    Object.entries(communities).map(([community, students]) => (
                      <div key={community} style={styles.communityBlock}>
                        {/* COMMUNITY LABEL */}
                        <div style={styles.communityLabel}>
                          <div style={styles.dot} />
                          <span>
                            {community} ({students.length})
                          </span>
                        </div>

                        <table style={styles.table}>
                          <thead>
                            <tr style={styles.theadRow}>
                              <th style={{ ...styles.th, width: "35%" }}>
                                Student Info
                              </th>
                              <th style={{ ...styles.th, width: "35%" }}>
                                Academic Details
                              </th>
                              <th
                                style={{
                                  ...styles.th,
                                  width: "30%",
                                  textAlign: "center",
                                }}
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((s) => (
                              <tr key={s.id} style={styles.tr}>
                                <td style={styles.td}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                    }}
                                  >
                                    <span style={styles.primaryText}>
                                      {s.full_name}
                                    </span>
                                    {s.is_claimed ? (
                                      <span style={styles.badgeSuccess}>
                                        Claimed
                                      </span>
                                    ) : (
                                      <span style={styles.badgePending}>
                                        Unclaimed
                                      </span>
                                    )}
                                  </div>
                                  <div style={styles.secondaryText}>
                                    Index: {s.index_number}
                                  </div>
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.locationText}>
                                    {s.program}
                                  </div>
                                  <div style={styles.secondaryText}>
                                    {s.level}
                                  </div>
                                </td>
                                <td style={styles.td}>
                                  <div style={styles.actionWrapper}>
                                    {/* TOGGLE ACTIVE BUTTON */}
                                    <button
                                      style={
                                        s.is_active
                                          ? styles.btnDeactivate
                                          : styles.btnActivate
                                      }
                                      title={
                                        s.is_active
                                          ? "Deactivate Account"
                                          : "Activate Account"
                                      }
                                    >
                                      {s.is_active ? (
                                        <PowerOff size={14} />
                                      ) : (
                                        <Power size={14} />
                                      )}
                                    </button>
                                    <button style={styles.btnEdit}>
                                      <Edit3 size={14} />
                                    </button>
                                    <button style={styles.btnDelete}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        ))
      )}
    </div>
  );
};

const styles = {
  container: { display: "flex", flexDirection: "column", gap: "15px" },
  loading: { padding: "40px", textAlign: "center", color: "#64748b" },
  searchBarWrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    padding: "12px 20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    gap: "20px",
  },
  searchInner: { display: "flex", alignItems: "center", gap: "10px", flex: 1 },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: "14px",
  },
  stats: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#64748b",
    fontSize: "13px",
  },

  regionSection: {
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    marginBottom: "15px",
  },
  regionHeader: {
    padding: "14px 20px",
    background: "#f8fafc",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid #e2e8f0",
  },

  districtBlock: {
    borderLeft: "4px solid #198104",
    marginLeft: "15px",
    borderBottom: "1px solid #f1f5f9",
  },
  districtHeader: {
    padding: "10px 20px",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#475569",
  },

  communityBlock: { padding: "10px 20px 20px 35px" },
  communityLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    marginBottom: "10px",
    textTransform: "uppercase",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#cbd5e1",
  },

  table: { width: "100%", borderCollapse: "collapse" },
  theadRow: { background: "#fdfdfd" },
  th: {
    padding: "10px",
    textAlign: "left",
    fontSize: "10px",
    textTransform: "uppercase",
    color: "#94a3b8",
  },
  tr: { borderBottom: "1px solid #f8fafc" },
  td: { padding: "12px 10px", verticalAlign: "middle" },

  primaryText: { fontWeight: "600", color: "#1e293b", fontSize: "13px" },
  secondaryText: { color: "#64748b", fontSize: "11px" },
  locationText: { color: "#475569", fontSize: "13px" },
  badgeSuccess: {
    fontSize: "9px",
    padding: "2px 6px",
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: "4px",
  },
  badgePending: {
    fontSize: "9px",
    padding: "2px 6px",
    backgroundColor: "#fef9c3",
    color: "#854d0e",
    borderRadius: "4px",
  },

  actionWrapper: { display: "flex", gap: "6px", justifyContent: "center" },
  btnEdit: {
    border: "none",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "6px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  btnDelete: {
    border: "none",
    background: "#fff1f2",
    color: "#e11d48",
    padding: "6px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  btnActivate: {
    border: "none",
    background: "#f0fdf4",
    color: "#16a34a",
    padding: "6px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  btnDeactivate: {
    border: "none",
    background: "#fff7ed",
    color: "#ea580c",
    padding: "6px",
    borderRadius: "6px",
    cursor: "pointer",
  },

  noResults: { textAlign: "center", padding: "40px", color: "#64748b" },
};

export default StudentList;
