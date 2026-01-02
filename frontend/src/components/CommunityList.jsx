import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Globe,
  Calendar,
  Clock,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  Edit3,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import axios from "../api/axios";
import EditCommunityModal from "./EditCommunityModal";
import ConfirmationModal from "./ConfirmationModal";

const CommunityList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState({});

  // --- MODAL STATES ---
  const [editModal, setEditModal] = useState({
    isOpen: false,
    data: null,
    isLoading: false,
  });

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    id: null,
    actionType: "",
    isLoading: false,
  });

  const [user] = useState(JSON.parse(localStorage.getItem("uds_user")) || {});
  const isSuperAdmin =
    user.role === "admin" && user.admin_level === "super_admin";

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/admin/get-communities");
      setData(res.data?.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleUpdate = async (updatedData) => {
    setEditModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await axios.post("/admin/edit_community", updatedData);
      // Refresh local data to reflect changes
      setData((prev) =>
        prev.map((c) =>
          c.id === updatedData.id ? { ...c, ...updatedData } : c
        )
      );
      setEditModal({ isOpen: false, data: null, isLoading: false });
    } catch (err) {
      alert(
        "Update failed: " + (err.response?.data?.message || "Server Error")
      );
      setEditModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const confirmAction = (id, actionType) => {
    setModalConfig({
      isOpen: true,
      id,
      actionType,
      isLoading: false,
    });
  };

  const handleRegionToggle = async (e, regionName, currentCommunities) => {
    e.stopPropagation(); // Prevent accordion collapse

    // Determine target state based on first community in group
    const targetState = !currentCommunities[0].coordinate_check;

    try {
      // Optimistic Update
      setData((prev) =>
        prev.map((c) =>
          c.region === regionName ? { ...c, coordinate_check: targetState } : c
        )
      );

      await axios.post("/admin/manage_community", {
        id: regionName,
        action: "toggle_region_coords",
      });
    } catch (err) {
      alert("Bulk update failed.");
      fetchCommunities(); // Rollback
    }
  };

  const handleAction = async (id, actionType) => {
    try {
      if (actionType.startsWith("toggle")) {
        setData((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, coordinate_check: !c.coordinate_check } : c
          )
        );
      }

      if (actionType === "delete") {
        setModalConfig((prev) => ({ ...prev, isLoading: true }));
      }

      await axios.post("/admin/manage_community", { id, action: actionType });

      if (actionType === "delete") {
        setData((prev) => prev.filter((c) => c.id !== id));
        setModalConfig({
          isOpen: false,
          id: null,
          actionType: "",
          isLoading: false,
        });
      }
    } catch (err) {
      if (err.response?.status === 428) {
        alert("Action Blocked: No active academic session found.");
        navigate("/admin/sessions");
      } else {
        alert(err.response?.data?.message || "Operation failed.");
        fetchCommunities();
      }
      setModalConfig((prev) => ({ ...prev, isLoading: false, isOpen: false }));
    }
  };

  const toggleRegion = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

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

  if (loading)
    return <div style={styles.loadingState}>Loading registry...</div>;

  return (
    <div style={styles.container}>
      {/* MODALS */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        isLoading={modalConfig.isLoading}
        title="Delete Community"
        message="Are you sure you want to hide this community? This action will be logged."
        type="danger"
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={() => handleAction(modalConfig.id, modalConfig.actionType)}
      />

      <EditCommunityModal
        isOpen={editModal.isOpen}
        community={editModal.data}
        isLoading={editModal.isLoading}
        onClose={() => setEditModal({ isOpen: false, data: null })}
        onSave={handleUpdate}
      />

      <div style={styles.searchWrapper}>
        <Search size={18} color="#94a3b8" />
        <input
          style={styles.input}
          placeholder="Search by name, region or district..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {Object.entries(groupedData).map(([region, districts]) => {
        const allInRegion = Object.values(districts).flat();
        const allVerified = allInRegion.every((c) => c.coordinate_check);

        return (
          <div key={region} style={styles.regionContainer}>
            <div
              style={styles.regionHeader}
              onClick={() => toggleRegion(region)}
            >
              <div style={styles.regionHeaderLeft}>
                {expanded[region] ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
                <Globe size={18} color="#16a34a" />
                <span style={styles.regionName}>{region}</span>
              </div>

              {/* NEW: REGION TOGGLE */}
              <div style={styles.regionHeaderRight}>
                <span style={styles.regionToggleLabel}>Bulk GPS Check</span>
                <button
                  style={styles.regionToggleBtn}
                  onClick={(e) => handleRegionToggle(e, region, allInRegion)}
                >
                  {allVerified ? (
                    <ToggleRight size={28} color="#16a34a" />
                  ) : (
                    <ToggleLeft size={28} color="#94a3b8" />
                  )}
                </button>
              </div>
            </div>

            {(expanded[region] || searchTerm) && (
              <div style={styles.regionBody}>
                {Object.entries(districts).map(([district, communities]) => (
                  <div key={district} style={styles.districtBlock}>
                    <div style={styles.districtLabel}>
                      <span>{district}</span>
                    </div>
                    <div style={styles.list}>
                      {communities.map((c) => (
                        <div key={c.id} style={styles.row}>
                          {/* LEFT: INFO */}
                          <div style={styles.rowMain}>
                            <MapPin
                              size={16}
                              color={c.coordinate_check ? "#16a34a" : "#cbd5e1"}
                            />
                            <div style={styles.commInfo}>
                              <span style={styles.commName}>{c.name}</span>
                              <span
                                style={{
                                  ...styles.commCoords,
                                  color: c.coordinate_check
                                    ? "#166534"
                                    : "#94a3b8",
                                }}
                              >
                                {c.latitude
                                  ? `${parseFloat(c.latitude).toFixed(
                                      4
                                    )}, ${parseFloat(c.longitude).toFixed(4)}`
                                  : "No GPS"}
                              </span>
                            </div>
                          </div>

                          {/* CENTER: DATE & WEEKS */}
                          <div style={styles.rowMetaCenter}>
                            <div style={styles.metaItem}>
                              <Calendar size={14} />
                              <span>{c.start_date || "TBD"}</span>
                            </div>
                            <div style={styles.metaItem}>
                              <Clock size={14} />
                              <span>{c.duration_weeks || 0} Weeks</span>
                            </div>
                          </div>

                          {/* RIGHT: ACTIONS */}
                          <div style={styles.rowActions}>
                            <button
                              title="Toggle GPS Check"
                              style={{
                                ...styles.actionBtn,
                                color: c.coordinate_check
                                  ? "#16a34a"
                                  : "#cbd5e1",
                              }}
                              onClick={() =>
                                handleAction(c.id, "toggle_coords")
                              }
                            >
                              {c.coordinate_check ? (
                                <ToggleRight size={28} />
                              ) : (
                                <ToggleLeft size={28} />
                              )}
                            </button>

                            <button
                              title="Edit Community"
                              style={{ ...styles.actionBtn, color: "#3b82f6" }}
                              onClick={() =>
                                setEditModal({ isOpen: true, data: c })
                              }
                            >
                              <Edit3 size={18} />
                            </button>

                            {isSuperAdmin && (
                              <button
                                title="Delete Community"
                                style={{
                                  ...styles.actionBtn,
                                  color: "#ef4444",
                                }}
                                onClick={() => confirmAction(c.id, "delete")}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  container: { maxWidth: "1000px", margin: "0 auto", paddingBottom: "40px" },
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
  },
  regionHeaderLeft: { display: "flex", alignItems: "center", gap: "12px" },
  regionHeaderRight: { display: "flex", alignItems: "center", gap: "12px" },
  regionToggleLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  regionToggleBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  regionName: { fontWeight: "700", fontSize: "16px", color: "#0f172a" },
  regionBody: { padding: "0 20px 20px 20px" },
  districtBlock: { marginTop: "20px" },
  districtLabel: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: "8px",
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
    padding: "12px 16px",
    background: "#fff",
  },
  rowMain: { flex: "1.2", display: "flex", alignItems: "center", gap: "14px" },
  commInfo: { display: "flex", flexDirection: "column" },
  commName: { fontWeight: "600", fontSize: "14px", color: "#1e293b" },
  commCoords: { fontSize: "11px", fontFamily: "monospace", marginTop: "2px" },
  rowMetaCenter: {
    flex: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "24px",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#64748b",
  },
  rowActions: {
    flex: "0.8",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "12px",
  },
  actionBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
};

export default CommunityList;
