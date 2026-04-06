import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  CalendarDays,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import axios, { isCancel } from "../api/axios";
import EditCommunityModal from "./EditCommunityModal";
import ConfirmationModal from "./ConfirmationModal";

const CommunityList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState({});

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

  // ── NEW: per-region date picker state ──────────────────────────────────────
  // { [regionName]: { open: bool, start_date: string, duration_weeks: string } }
  const [regionDatePicker, setRegionDatePicker] = useState({});
  const [regionDateLoading, setRegionDateLoading] = useState({});

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("uds_user")) || {};
    } catch {
      return {};
    }
  });
  const isSuperAdmin =
    user.role === "admin" && user.admin_level === "super_admin";

  const fetchCommunities = useCallback(async () => {
    const controller = new AbortController();
    try {
      setLoading(true);
      const res = await axios.get("/admin/get-communities", {
        signal: controller.signal,
      });
      setData(res.data?.data || []);
    } catch (err) {
      if (isCancel(err)) return;
      console.error("Fetch error:", err);
      toast.error("Failed to load communities. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const handleUpdate = async (updatedData) => {
    setEditModal((prev) => ({ ...prev, isLoading: true }));
    try {
      await axios.post("/admin/edit_community", updatedData);
      setData((prev) =>
        prev.map((c) =>
          c.id === updatedData.id ? { ...c, ...updatedData } : c,
        ),
      );
      setEditModal({ isOpen: false, data: null, isLoading: false });
      toast.success("Community updated successfully.");
    } catch (err) {
      toast.error(
        "Update failed: " + (err.response?.data?.message || "Server Error"),
      );
      setEditModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const confirmAction = (id, actionType) => {
    setModalConfig({ isOpen: true, id, actionType, isLoading: false });
  };

  const handleRegionToggle = async (e, regionName, currentCommunities) => {
    e.stopPropagation();
    const targetState = !currentCommunities[0].coordinate_check;
    try {
      setData((prev) =>
        prev.map((c) =>
          c.region === regionName ? { ...c, coordinate_check: targetState } : c,
        ),
      );
      await axios.post("/admin/manage_community", {
        id: regionName,
        action: "toggle_region_coords",
      });
      toast.success(
        `GPS check ${targetState ? "enabled" : "disabled"} for ${regionName}.`,
      );
    } catch (err) {
      toast.error("Bulk update failed. Changes rolled back.");
      fetchCommunities();
    }
  };

  // ── NEW: open/close the inline date picker for a region ────────────────────
  const openRegionDatePicker = (e, regionName, currentCommunities) => {
    e.stopPropagation();
    // Pre-fill with the first community's existing date if available
    const existingDate = currentCommunities[0]?.start_date || "";
    const existingDuration = currentCommunities[0]?.duration_weeks || "8";
    setRegionDatePicker((prev) => ({
      ...prev,
      [regionName]: {
        open: !prev[regionName]?.open,
        start_date: existingDate,
        duration_weeks: String(existingDuration),
      },
    }));
  };

  const updateRegionDateField = (regionName, field, value) => {
    setRegionDatePicker((prev) => ({
      ...prev,
      [regionName]: { ...prev[regionName], [field]: value },
    }));
  };

  const handleRegionDateSave = async (e, regionName) => {
    e.stopPropagation();
    const picker = regionDatePicker[regionName];
    if (!picker?.start_date) {
      toast.error("Please select a start date.");
      return;
    }

    setRegionDateLoading((prev) => ({ ...prev, [regionName]: true }));
    try {
      const payload = {
        id: regionName,
        action: "set_region_start_date",
        start_date: picker.start_date,
      };
      if (picker.duration_weeks) {
        payload.duration_weeks = parseInt(picker.duration_weeks, 10);
      }

      await axios.post("/admin/manage_community", payload);

      // Optimistic update — apply to all communities in this region
      setData((prev) =>
        prev.map((c) =>
          c.region === regionName
            ? {
                ...c,
                start_date: picker.start_date,
                duration_weeks: picker.duration_weeks
                  ? parseInt(picker.duration_weeks, 10)
                  : c.duration_weeks,
              }
            : c,
        ),
      );

      // Close the picker
      setRegionDatePicker((prev) => ({
        ...prev,
        [regionName]: { ...prev[regionName], open: false },
      }));

      toast.success(`Start date set for all communities in ${regionName}.`);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to set region start date.",
      );
    } finally {
      setRegionDateLoading((prev) => ({ ...prev, [regionName]: false }));
    }
  };

  const cancelRegionDatePicker = (e, regionName) => {
    e.stopPropagation();
    setRegionDatePicker((prev) => ({
      ...prev,
      [regionName]: { ...prev[regionName], open: false },
    }));
  };

  const handleAction = async (id, actionType) => {
    try {
      if (actionType.startsWith("toggle")) {
        setData((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, coordinate_check: !c.coordinate_check } : c,
          ),
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
        toast.success("Community removed.");
      }
    } catch (err) {
      if (err.response?.status === 428) {
        toast.error("Action blocked: No active academic session found.");
        navigate("/admin/sessions");
      } else {
        toast.error(err.response?.data?.message || "Operation failed.");
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
        c.region?.toLowerCase().includes(searchTerm.toLowerCase()),
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
        const picker = regionDatePicker[region];
        const pickerOpen = picker?.open || false;
        const pickerLoading = regionDateLoading[region] || false;

        // Summary: show the most common start_date in the region
        const regionDates = allInRegion
          .map((c) => c.start_date)
          .filter(Boolean);
        const regionDateSummary =
          regionDates.length > 0 ? regionDates[0] : null;

        return (
          <div key={region} style={styles.regionContainer}>
            <div
              style={styles.regionHeader}
              onClick={() => toggleRegion(region)}
            >
              {/* ── Left: expand + name ── */}
              <div style={styles.regionHeaderLeft}>
                {expanded[region] ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
                <Globe size={18} color="#16a34a" />
                <span style={styles.regionName}>{region}</span>
              </div>

              {/* ── Right: bulk controls ── */}
              <div
                style={styles.regionHeaderRight}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Bulk Start Date button */}
                <div style={styles.regionControl}>
                  <span style={styles.regionToggleLabel}>
                    {regionDateSummary
                      ? `From ${regionDateSummary}`
                      : "Bulk Start Date"}
                  </span>
                  <button
                    style={{
                      ...styles.regionDateBtn,
                      backgroundColor: pickerOpen ? "#f0fdf4" : "#fff",
                      borderColor: pickerOpen ? "#16a34a" : "#e2e8f0",
                      color: pickerOpen ? "#16a34a" : "#64748b",
                    }}
                    title="Set start date for all communities in this region"
                    onClick={(e) =>
                      openRegionDatePicker(e, region, allInRegion)
                    }
                  >
                    <CalendarDays size={15} />
                    <span style={{ fontSize: "12px", fontWeight: "600" }}>
                      Set Dates
                    </span>
                  </button>
                </div>

                {/* Bulk GPS toggle */}
                <div style={styles.regionControl}>
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
            </div>

            {/* ── Inline date picker panel ─────────────────────────────── */}
            {pickerOpen && (
              <div
                style={styles.datePanelWrapper}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={styles.datePanelInner}>
                  <div style={styles.datePanelLeft}>
                    <CalendarDays size={16} color="#16a34a" />
                    <span style={styles.datePanelTitle}>
                      Set start date for all communities in{" "}
                      <strong>{region}</strong>
                    </span>
                  </div>
                  <div style={styles.datePanelFields}>
                    <div style={styles.dateField}>
                      <label style={styles.dateFieldLabel}>Start Date</label>
                      <input
                        type="date"
                        value={picker?.start_date || ""}
                        onChange={(e) =>
                          updateRegionDateField(
                            region,
                            "start_date",
                            e.target.value,
                          )
                        }
                        style={styles.dateInput}
                      />
                    </div>
                    <div style={styles.dateField}>
                      <label style={styles.dateFieldLabel}>
                        Duration (Weeks)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={picker?.duration_weeks || ""}
                        placeholder="e.g. 8"
                        onChange={(e) =>
                          updateRegionDateField(
                            region,
                            "duration_weeks",
                            e.target.value,
                          )
                        }
                        style={{ ...styles.dateInput, width: "90px" }}
                      />
                    </div>
                  </div>
                  <div style={styles.datePanelActions}>
                    <button
                      style={styles.datePanelCancel}
                      onClick={(e) => cancelRegionDatePicker(e, region)}
                      disabled={pickerLoading}
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      style={{
                        ...styles.datePanelSave,
                        opacity: pickerLoading ? 0.7 : 1,
                        cursor: pickerLoading ? "not-allowed" : "pointer",
                      }}
                      onClick={(e) => handleRegionDateSave(e, region)}
                      disabled={pickerLoading}
                    >
                      <Check size={14} />
                      {pickerLoading
                        ? "Saving..."
                        : `Apply to ${allInRegion.length} Communities`}
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                                  ? `${parseFloat(c.latitude).toFixed(4)}, ${parseFloat(c.longitude).toFixed(4)}`
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
  regionHeaderRight: { display: "flex", alignItems: "center", gap: "16px" },
  regionControl: { display: "flex", alignItems: "center", gap: "8px" },
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
  regionDateBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    borderRadius: "7px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "all .15s ease",
  },
  regionName: { fontWeight: "700", fontSize: "16px", color: "#0f172a" },

  // ── Date picker panel ──
  datePanelWrapper: {
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    padding: "16px 20px",
  },
  datePanelInner: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "16px",
  },
  datePanelLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#475569",
    flex: "1 1 200px",
  },
  datePanelTitle: { fontSize: "13px", color: "#334155" },
  datePanelFields: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  dateField: { display: "flex", flexDirection: "column", gap: "4px" },
  dateFieldLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  dateInput: {
    padding: "8px 10px",
    borderRadius: "7px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
    color: "#1e293b",
    outline: "none",
    fontFamily: "inherit",
  },
  datePanelActions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginLeft: "auto",
  },
  datePanelCancel: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "7px 12px",
    borderRadius: "7px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    cursor: "pointer",
  },
  datePanelSave: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "7px 14px",
    borderRadius: "7px",
    border: "none",
    background: "#198104",
    fontSize: "12px",
    fontWeight: "600",
    color: "#fff",
    cursor: "pointer",
  },

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

export default React.memo(CommunityList);
