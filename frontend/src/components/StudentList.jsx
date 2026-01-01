import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Search,
  Users,
  Power,
  PowerOff,
  Smartphone,
  Loader2,
  AlertCircle,
} from "lucide-react";
import axios from "../api/axios";
import EditStudentModal from "./EditStudentModal";
import ConfirmationModal from "./ConfirmationModal";

const StudentList = () => {
  const [rawData, setRawData] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    id: null,
    action: null,
    title: "",
    message: "",
    type: "danger",
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);

  // FETCH DATA
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/admin/get-students");
      setRawData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch students error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ACTION HANDLERS
  const triggerConfirm = (id, action) => {
    const configs = {
      delete: {
        title: "Delete Student?",
        message:
          "This will permanently remove the student and all records. This cannot be undone.",
        type: "danger",
      },
      clear_device: {
        title: "Reset Device Lock?",
        message: "The student will be able to log in from a new device.",
        type: "info",
      },
      toggle_status: {
        title: "Change Account Status?",
        message:
          "This will immediately enable or disable portal access for this student.",
        type: "warning",
      },
    };

    setConfirmConfig({
      isOpen: true,
      id,
      action,
      ...configs[action],
    });
  };

  const executeAction = async () => {
    const { id, action } = confirmConfig;
    const loadingKey = `${id}-${action}`;

    try {
      setActionLoading(loadingKey);
      await axios.post("/admin/student-actions", { id, action });

      // OPTIMISTIC UPDATES: Update local state instead of re-fetching everything
      setRawData((prev) => {
        if (action === "delete") {
          return prev.filter((s) => s.id !== id);
        }
        return prev.map((s) => {
          if (s.id === id) {
            if (action === "toggle_status")
              return { ...s, is_active: !s.is_active };
            if (action === "clear_device") return { ...s, device_id: null };
          }
          return s;
        });
      });

      setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Action failed. Please check your connection.";
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (student) => {
    setCurrentStudent(student);
    setIsEditModalOpen(true);
  };

  // GROUPING & FILTERING
  const groupedData = useMemo(() => {
    const lowerSearch = searchTerm.trim().toLowerCase();

    return rawData
      .filter(
        (s) =>
          !lowerSearch ||
          [s.full_name, s.index_number, s.uin].some((f) =>
            f?.toLowerCase().includes(lowerSearch)
          )
      )
      .reduce((acc, s) => {
        const r = s.region || "Unassigned Region";
        const d = s.district || "Unassigned District";
        const c = s.community || "Unassigned Community";

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

  if (loading)
    return (
      <div style={styles.loading}>
        <Loader2 className="animate-spin" size={24} />
        <p>Loading student database...</p>
      </div>
    );

  return (
    <div style={styles.container}>
      {/* SEARCH BAR */}
      <div style={styles.searchBarWrapper}>
        <div style={styles.searchInner}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search by Name, UIN, or Index..."
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

      {/* DATA LIST */}
      {Object.keys(groupedData).length === 0 ? (
        <div style={styles.noResults}>
          <AlertCircle size={32} style={{ marginBottom: 10, opacity: 0.5 }} />
          <p>No students found matching "{searchTerm}"</p>
        </div>
      ) : (
        Object.entries(groupedData).map(([region, districts]) => {
          const isRegionExpanded = expandedSections[region] || searchTerm;
          return (
            <div key={region} style={styles.regionSection}>
              <div
                style={styles.regionHeader}
                onClick={() => toggleSection(region)}
              >
                {isRegionExpanded ? (
                  <ChevronDown size={18} />
                ) : (
                  <ChevronRight size={18} />
                )}
                <MapPin size={16} color="#198104" />
                <span style={{ fontWeight: "800" }}>{region}</span>
              </div>

              {isRegionExpanded &&
                Object.entries(districts).map(([district, communities]) => {
                  const districtKey = `${region}-${district}`;
                  const isDistrictExpanded =
                    expandedSections[districtKey] || searchTerm;

                  return (
                    <div key={district} style={styles.districtBlock}>
                      <div
                        style={styles.districtHeader}
                        onClick={() => toggleSection(districtKey)}
                      >
                        {isDistrictExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        <span>
                          District: <strong>{district}</strong>
                        </span>
                      </div>

                      {isDistrictExpanded &&
                        Object.entries(communities).map(
                          ([community, students]) => (
                            <div key={community} style={styles.communityBlock}>
                              <div style={styles.communityLabel}>
                                <div style={styles.dot} />
                                <span>
                                  {community} ({students.length})
                                </span>
                              </div>

                              <table style={styles.table}>
                                <thead>
                                  <tr style={styles.theadRow}>
                                    <th style={{ ...styles.th, width: "40%" }}>
                                      Student Info
                                    </th>
                                    <th style={{ ...styles.th, width: "30%" }}>
                                      Academic
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
                                          <span
                                            style={
                                              s.is_claimed
                                                ? styles.badgeSuccess
                                                : styles.badgePending
                                            }
                                          >
                                            {s.is_claimed
                                              ? "Claimed"
                                              : "Unclaimed"}
                                          </span>
                                        </div>
                                        <div style={styles.secondaryText}>
                                          UIN: {s.uin} | Index: {s.index_number}
                                        </div>
                                      </td>
                                      <td style={styles.td}>
                                        <div style={styles.locationText}>
                                          {s.program}
                                        </div>
                                        <div style={styles.secondaryText}>
                                          Level {s.level}
                                        </div>
                                      </td>
                                      <td style={styles.td}>
                                        <div style={styles.actionWrapper}>
                                          {/* 1. DEVICE RESET BUTTON (Only shows if student has claimed an account) */}
                                          {s.is_claimed && (
                                            <>
                                              <button
                                                style={styles.btnDevice}
                                                disabled={!!actionLoading} // Disable all buttons if ANY action is running
                                                onClick={() =>
                                                  triggerConfirm(
                                                    s.id,
                                                    "clear_device"
                                                  )
                                                }
                                                title="Reset Device Lock"
                                              >
                                                {actionLoading ===
                                                `${s.id}-clear_device` ? (
                                                  <Loader2
                                                    size={14}
                                                    className="animate-spin"
                                                  />
                                                ) : (
                                                  <Smartphone size={14} />
                                                )}
                                              </button>

                                              {/* 2. TOGGLE STATUS (Active/Inactive) */}
                                              <button
                                                style={
                                                  s.is_active
                                                    ? styles.btnDeactivate
                                                    : styles.btnActivate
                                                }
                                                disabled={!!actionLoading}
                                                onClick={() =>
                                                  triggerConfirm(
                                                    s.id,
                                                    "toggle_status"
                                                  )
                                                }
                                                title={
                                                  s.is_active
                                                    ? "Deactivate Student"
                                                    : "Activate Student"
                                                }
                                              >
                                                {actionLoading ===
                                                `${s.id}-toggle_status` ? (
                                                  <Loader2
                                                    size={14}
                                                    className="animate-spin"
                                                  />
                                                ) : s.is_active ? (
                                                  <PowerOff size={14} />
                                                ) : (
                                                  <Power size={14} />
                                                )}
                                              </button>
                                            </>
                                          )}

                                          {/* 3. EDIT BUTTON */}
                                          <button
                                            style={styles.btnEdit}
                                            disabled={!!actionLoading}
                                            onClick={() => openEditModal(s)}
                                            title="Edit Details"
                                          >
                                            <Edit3 size={14} />
                                          </button>

                                          {/* 4. DELETE BUTTON */}
                                          <button
                                            style={styles.btnDelete}
                                            disabled={!!actionLoading}
                                            onClick={() =>
                                              triggerConfirm(s.id, "delete")
                                            }
                                            title="Permanent Delete"
                                          >
                                            {actionLoading ===
                                            `${s.id}-delete` ? (
                                              <Loader2
                                                size={14}
                                                className="animate-spin"
                                              />
                                            ) : (
                                              <Trash2 size={14} />
                                            )}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        )}
                    </div>
                  );
                })}
            </div>
          );
        })
      )}

      {/* MODALS */}
      <EditStudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={currentStudent}
        onUpdateSuccess={fetchStudents}
      />
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        isLoading={!!actionLoading}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={executeAction}
      />
    </div>
  );
};

// ... Styles (Same as before but with minor fixes for centering) ...
const styles = {
  container: { display: "flex", flexDirection: "column", gap: "15px" },
  loading: {
    padding: "100px 40px",
    textAlign: "center",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
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
  btnDevice: {
    border: "none",
    background: "#f5f3ff",
    color: "#7c3aed",
    padding: "6px",
    borderRadius: "6px",
    cursor: "pointer",
  },
  noResults: {
    textAlign: "center",
    padding: "60px 40px",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
};

export default StudentList;
