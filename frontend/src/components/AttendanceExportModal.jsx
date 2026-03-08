import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { Download, X, Archive, AlertCircle, MapPin } from "lucide-react";

const AttendanceExportModal = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableCommunities, setAvailableCommunities] = useState([]);

  const [filters, setFilters] = useState({
    session_id: "",
    region: "",
    district: "",
    community_id: "",
  });

  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Initial Load: Sessions
  useEffect(() => {
    const controller = new AbortController();

    const fetchSessions = async () => {
      try {
        const res = await axios.get("/admin/get-sessions", {
          signal: controller.signal,
        });
        setSessions(res.data);
        const current = res.data.find((s) => s.is_current);
        if (current) handleFilterChange("session_id", current.id);
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Failed to load sessions");
      }
    };
    if (isOpen) fetchSessions();
    return () => controller.abort();
  }, [isOpen]);

  // 2. Cascade Logic: When session or geography changes
  const handleFilterChange = async (name, value) => {
    const newFilters = { ...filters, [name]: value };

    // Reset children when a parent changes
    if (name === "session_id") {
      newFilters.region = "";
      newFilters.district = "";
      newFilters.community_id = "";
      fetchOptions("regions", { session_id: value });
    } else if (name === "region") {
      newFilters.district = "";
      newFilters.community_id = "";
      fetchOptions("districts", {
        session_id: filters.session_id,
        region: value,
      });
    } else if (name === "district") {
      newFilters.community_id = "";
      fetchOptions("communities", {
        session_id: filters.session_id,
        region: filters.region,
        district: value,
      });
    }

    setFilters(newFilters);
  };

  const fetchOptions = async (type, params) => {
    if (!params.session_id) return;
    setIsLoadingFilters(true);
    try {
      const res = await axios.get(`/admin/get-location-filters?type=${type}`, {
        params,
      });
      if (type === "regions") setAvailableRegions(res.data);
      if (type === "districts") setAvailableDistricts(res.data);
      if (type === "communities") setAvailableCommunities(res.data);
    } catch (err) {
      console.error(`Failed to load ${type}`);
    } finally {
      setIsLoadingFilters(false);
    }
  };

  const handleDownload = async () => {
    if (!filters.session_id) return alert("Please select an Academic Session");

    setIsExporting(true);
    try {
      const res = await axios.get("/admin/export-attendance", {
        params: filters,
        responseType: "blob", // CRITICAL: Tells Axios to handle binary data (ZIP)
      });

      // Create a physical link in memory for the file
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;

      // Get filename from response header or use default
      const filename = `Attendance_Export_${new Date().toISOString().slice(0, 10)}.zip`;
      link.setAttribute("download", filename);

      document.body.appendChild(link);
      link.click(); // Trigger the download

      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert(err.response?.data?.error || "Export failed. Check server logs.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Archive size={20} /> Export Center
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.body}>
          <p style={styles.info}>
            Select the specific area for export. Leaving fields empty will
            export all data for that level.
          </p>

          {/* Session Select */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Academic Session *</label>
            <select
              style={styles.select}
              value={filters.session_id}
              onChange={(e) => handleFilterChange("session_id", e.target.value)}
            >
              <option value="">Select Session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.year_start}/{s.year_end} - {s.description}
                </option>
              ))}
            </select>
          </div>

          {/* Region & District Grid */}
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Region</label>
              <select
                style={styles.select}
                value={filters.region}
                disabled={!filters.session_id}
                onChange={(e) => handleFilterChange("region", e.target.value)}
              >
                <option value="">All Regions</option>
                {availableRegions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>District</label>
              <select
                style={styles.select}
                value={filters.district}
                disabled={!filters.region}
                onChange={(e) => handleFilterChange("district", e.target.value)}
              >
                <option value="">All Districts</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Community Select */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Specific Community</label>
            <select
              style={styles.select}
              value={filters.community_id}
              disabled={!filters.district}
              onChange={(e) =>
                handleFilterChange("community_id", e.target.value)
              }
            >
              <option value="">All Communities in District</option>
              {availableCommunities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.warningBox}>
            <AlertCircle size={16} />
            <span>
              Structured as:{" "}
              <b>
                Region / District / {filters.community_id ? "Community" : "All"}
              </b>
            </span>
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting || !filters.session_id}
            style={
              isExporting ? styles.downloadBtnDisabled : styles.downloadBtn
            }
          >
            {isExporting ? "Packaging..." : "Generate ZIP Package"}
            <Download size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "12px",
    width: "500px",
    maxWidth: "90%",
    overflow: "hidden",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  header: {
    padding: "20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  body: { padding: "20px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
  formGroup: { marginBottom: "15px" },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
    marginBottom: "5px",
  },
  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    outline: "none",
  },
  warningBox: {
    backgroundColor: "#fefce8",
    border: "1px solid #fef08a",
    padding: "12px",
    borderRadius: "8px",
    display: "flex",
    gap: "10px",
    fontSize: "12px",
    color: "#854d0e",
    marginTop: "10px",
  },
  footer: {
    padding: "15px 20px",
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  downloadBtn: {
    backgroundColor: "#198104",
    color: "white",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  downloadBtnDisabled: {
    backgroundColor: "#94a3b8",
    color: "white",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    fontWeight: "600",
    cursor: "not-allowed",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  cancelBtn: {
    backgroundColor: "transparent",
    color: "#64748b",
    padding: "10px 20px",
    border: "none",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default AttendanceExportModal;
