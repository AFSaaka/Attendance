import React, { useEffect, useState, useMemo } from "react";
import {
  RefreshCw,
  Mail,
  Edit3,
  Power,
  Trash2,
  ChevronDown,
  ChevronRight,
  MapPin,
  CheckCircle,
  AlertCircle,
  Search,
  Users,
} from "lucide-react";
import axios from "../api/axios";

const CoordinatorList = () => {
  const [rawData, setRawData] = useState([]);
  const [expandedRegions, setExpandedRegions] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCoordinators = async () => {
    try {
      const res = await axios.get("/admin/get-coordinators");
      setRawData(res.data);
      // Initialize all collapsed
      setExpandedRegions({});
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordinators();
  }, []);

  // Filter and Group logic
  const filteredGroupedData = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();

    const filtered = rawData.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(lowerSearch) ||
        c.email?.toLowerCase().includes(lowerSearch) ||
        c.district?.toLowerCase().includes(lowerSearch) ||
        c.phone_number?.includes(searchTerm)
    );

    return filtered.reduce((acc, curr) => {
      const region = curr.region || "Unassigned";
      if (!acc[region]) acc[region] = [];
      acc[region].push(curr);
      return acc;
    }, {});
  }, [rawData, searchTerm]);

  const toggleRegion = (region) => {
    setExpandedRegions((prev) => ({ ...prev, [region]: !prev[region] }));
  };

  const isExpired = (expiryDate) => new Date(expiryDate) < new Date();

  if (loading) return <div style={styles.loading}>Loading registry...</div>;

  return (
    <div style={styles.container}>
      {/* Search Header */}
      <div style={styles.searchBarWrapper}>
        <div style={styles.searchInner}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search coordinators by name, email, or district..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={styles.stats}>
          <Users size={16} />
          <span>Coordinators: {rawData.length}</span>
        </div>
      </div>

      {Object.keys(filteredGroupedData).length === 0 ? (
        <div style={styles.noResults}>
          No coordinators found matching "{searchTerm}"
        </div>
      ) : (
        Object.entries(filteredGroupedData).map(([region, members]) => (
          <div key={region} style={styles.regionSection}>
            <div
              style={styles.regionHeader}
              onClick={() => toggleRegion(region)}
            >
              <div style={styles.regionTitle}>
                {/* Auto-expand if searching, otherwise use toggle state */}
                {expandedRegions[region] || searchTerm ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
                <MapPin size={16} color="#198104" />
                <span>{region}</span>
                <span style={styles.countBadge}>{members.length}</span>
              </div>
            </div>

            {(expandedRegions[region] || searchTerm) && (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={{ ...styles.th, width: "35%" }}>
                        Coordinator Details
                      </th>
                      <th style={{ ...styles.th, width: "20%" }}>District</th>
                      <th style={{ ...styles.th, width: "20%" }}>OTP Status</th>
                      <th
                        style={{
                          ...styles.th,
                          width: "25%",
                          textAlign: "center",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((c) => (
                      <tr key={c.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.primaryText}>{c.full_name}</div>
                          <div style={styles.secondaryText}>{c.email}</div>
                          <div style={styles.secondaryText}>
                            {c.phone_number}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.locationText}>{c.district}</div>
                        </td>
                        <td style={styles.td}>
                          {!c.must_reset_password ? (
                            <span style={styles.statusActive}>
                              <CheckCircle size={12} /> Active
                            </span>
                          ) : isExpired(c.otp_expires_at) ? (
                            <span style={styles.statusExpired}>
                              <AlertCircle size={12} /> Expired ({c.otp_code})
                            </span>
                          ) : (
                            <span style={styles.statusPending}>
                              Pending ({c.otp_code})
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionWrapper}>
                            <button
                              style={styles.btnRefresh}
                              title="Refresh OTP"
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button style={styles.btnEdit} title="Edit">
                              <Edit3 size={14} />
                            </button>
                            <button style={styles.btnMail} title="Send Email">
                              <Mail size={14} />
                            </button>
                            <button style={styles.btnToggle} title="Status">
                              <Power size={14} />
                            </button>
                            <button style={styles.btnDelete} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

const styles = {
  container: { display: "flex", flexDirection: "column", gap: "15px" },
  loading: { padding: "40px", textAlign: "center", color: "#64748b" },

  // Search Bar Styles
  searchBarWrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    padding: "12px 20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    gap: "20px",
    marginBottom: "5px",
  },
  searchInner: { display: "flex", alignItems: "center", gap: "10px", flex: 1 },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: "14px",
    color: "#1e293b",
  },
  stats: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "500",
  },

  regionSection: {
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  regionHeader: {
    padding: "14px 20px",
    background: "#f8fafc",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid #e2e8f0",
  },
  regionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: "700",
    color: "#1e293b",
    fontSize: "15px",
  },
  countBadge: {
    background: "#e2e8f0",
    padding: "2px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    color: "#475569",
  },

  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  theadRow: { background: "#fdfdfd", borderBottom: "1px solid #f1f5f9" },
  th: {
    padding: "12px 20px",
    textAlign: "left",
    fontSize: "11px",
    textTransform: "uppercase",
    color: "#64748b",
    fontWeight: "700",
  },
  tr: { borderBottom: "1px solid #f8fafc" },
  td: {
    padding: "16px 20px",
    verticalAlign: "middle",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  primaryText: { fontWeight: "600", color: "#1e293b", fontSize: "14px" },
  secondaryText: { color: "#64748b", fontSize: "12px" },
  locationText: { color: "#475569", fontSize: "13px" },

  statusActive: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
  },
  statusPending: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    background: "#fef9c3",
    color: "#a16207",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
  },
  statusExpired: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
  },

  noResults: {
    textAlign: "center",
    padding: "40px",
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "2px dashed #e2e8f0",
  },
  actionWrapper: { display: "flex", gap: "6px", justifyContent: "center" },
  btnRefresh: {
    border: "none",
    background: "#f1f5f9",
    color: "#475569",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  btnEdit: {
    border: "none",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  btnMail: {
    border: "none",
    background: "#f5f3ff",
    color: "#7c3aed",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  btnToggle: {
    border: "none",
    background: "#ecfdf5",
    color: "#059669",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  btnDelete: {
    border: "none",
    background: "#fff1f2",
    color: "#e11d48",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default CoordinatorList;
