import React, { useEffect, useState, useMemo } from "react";
import {
  MapPin,
  Globe,
  Calendar,
  Clock,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import axios from "../api/axios";

const CommunityList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState({});

  const fetchCommunities = async () => {
    try {
      const res = await axios.get("/admin/get-communities");
      setData(res.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const groupedData = useMemo(() => {
    const filtered = data.filter(
      (c) =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.region?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.reduce((acc, curr) => {
      const region = curr.region || "Unassigned";
      const district = curr.district || "Unassigned";
      if (!acc[region]) acc[region] = {};
      if (!acc[region][district]) acc[region][district] = [];
      acc[region][district].push(curr);
      return acc;
    }, {});
  }, [data, searchTerm]);

  const toggle = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading)
    return (
      <div style={styles.loadingState}>
        <div className="animate-pulse">Loading communities...</div>
      </div>
    );

  return (
    <div style={styles.container}>
      {/* Enhanced Search Header */}
      <div style={styles.searchWrapper}>
        <Search size={18} color="#94a3b8" />
        <input
          style={styles.input}
          placeholder="Search by name, district, or region..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {Object.entries(groupedData).map(([region, districts]) => (
        <div key={region} style={styles.regionContainer}>
          <div style={styles.regionHeader} onClick={() => toggle(region)}>
            <div style={styles.regionHeaderLeft}>
              {expanded[region] ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
              <Globe size={18} color="#16a34a" />
              <span style={styles.regionName}>{region}</span>
            </div>
            <span style={styles.regionCount}>
              {Object.values(districts).flat().length} Communities
            </span>
          </div>

          {(expanded[region] || searchTerm) && (
            <div style={styles.regionBody}>
              {Object.entries(districts).map(([district, communities]) => (
                <div key={district} style={styles.districtBlock}>
                  <div style={styles.districtLabel}>
                    <div style={styles.districtLine} />
                    <span>{district}</span>
                  </div>

                  <div style={styles.list}>
                    {communities.map((c) => {
                      const hasGPS = c.latitude && c.longitude;
                      return (
                        <div key={c.id} style={styles.row}>
                          <div style={styles.rowMain}>
                            <MapPin
                              size={16}
                              color={hasGPS ? "#ef4444" : "#cbd5e1"}
                              style={{ flexShrink: 0 }}
                            />
                            <div style={styles.commInfo}>
                              <span style={styles.commName}>{c.name}</span>
                              <div style={styles.commCoords}>
                                {hasGPS ? (
                                  `${parseFloat(c.latitude).toFixed(
                                    4
                                  )}, ${parseFloat(c.longitude).toFixed(4)}`
                                ) : (
                                  <span style={styles.missingGps}>
                                    <AlertCircle size={12} /> Missing GPS
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={styles.rowMeta}>
                            <div style={styles.metaItem}>
                              <Calendar size={14} />
                              <span>{c.start_date || "TBD"}</span>
                            </div>
                            <div style={styles.metaItem}>
                              <Clock size={14} />
                              <span>{c.duration_weeks || 5} Weeks</span>
                            </div>
                            <button style={styles.deleteBtn} title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
  },
  loadingState: {
    padding: "40px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "15px",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 18px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  input: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: "15px",
    color: "#1e293b",
  },
  regionContainer: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "12px",
    overflow: "hidden",
  },
  regionHeader: {
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    background: "#fff",
    transition: "background 0.2s",
  },
  regionHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  regionName: {
    fontWeight: "700",
    fontSize: "16px",
    color: "#0f172a",
  },
  regionCount: {
    fontSize: "12px",
    background: "#f1f5f9",
    color: "#64748b",
    padding: "4px 10px",
    borderRadius: "20px",
    fontWeight: "600",
  },
  regionBody: {
    padding: "0 20px 20px 20px",
    background: "#fff",
  },
  districtBlock: {
    marginTop: "20px",
  },
  districtLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "11px",
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "12px",
  },
  districtLine: {
    height: "1px",
    width: "24px",
    background: "#e2e8f0",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    background: "#f1f5f9",
    border: "1px solid #f1f5f9",
    borderRadius: "8px",
    overflow: "hidden",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#fff",
    transition: "background 0.2s",
  },
  rowMain: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flex: 1,
  },
  commInfo: {
    display: "flex",
    flexDirection: "column",
  },
  commName: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#1e293b",
  },
  commCoords: {
    fontSize: "12px",
    color: "#94a3b8",
    fontFamily: "monospace",
  },
  missingGps: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "#f76666ff",
    fontStyle: "italic",
    fontFamily: "sans-serif",
  },
  rowMeta: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#64748b",
  },
  deleteBtn: {
    border: "none",
    background: "transparent",
    color: "#cbd5e1",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    transition: "all 0.2s",
    marginLeft: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default CommunityList;
