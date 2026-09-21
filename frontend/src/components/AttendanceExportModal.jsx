import React, { useState, useEffect, useCallback } from "react";
import axios, { isCancel } from "../api/axios";
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
  const [progress, setProgress] = useState({
    processed: 0,
    total: 0,
    currentCommunity: "",
  });

  // fetchOptions doesn't close over any changing state — it only uses its
  // own arguments plus stable setState setters — so it's safe to give it a
  // stable identity via useCallback. That's what lets the effect below
  // safely list it as a dependency without re-firing on every render.
  const fetchOptions = useCallback(async (type, params) => {
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
      console.error(`Failed to load ${type}`, err);
    } finally {
      setIsLoadingFilters(false);
    }
  }, []);

  // 1. Initial Load: Sessions
  // This used to call handleFilterChange(), which pulled in the whole
  // cascade function as a dependency — but handleFilterChange is
  // recreated every render (it closes over `filters`), so adding it here
  // would make this effect re-fire on every filter change instead of just
  // once when the modal opens. Inlining the specific "default to current
  // session" logic avoids that dependency entirely.
  useEffect(() => {
    const controller = new AbortController();

    const fetchSessions = async () => {
      try {
        const res = await axios.get("/admin/get-sessions", {
          signal: controller.signal,
        });
        setSessions(res.data);
        const current = res.data.find((s) => s.is_current);
        if (current) {
          setFilters((prev) => ({
            ...prev,
            session_id: current.id,
            region: "",
            district: "",
            community_id: "",
          }));
          fetchOptions("regions", { session_id: current.id });
        }
      } catch (err) {
        if (isCancel(err)) return;
        console.error("Failed to load sessions", err);
      }
    };
    if (isOpen) fetchSessions();
    return () => controller.abort();
  }, [isOpen, fetchOptions]);

  // 2. Cascade Logic: When session or geography changes
  const handleFilterChange = (name, value) => {
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

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleDownload = async () => {
    if (!filters.session_id) return alert("Please select an Academic Session");

    setIsExporting(true);
    setProgress({ processed: 0, total: 0, currentCommunity: "" });

    try {
      // 1. Start the job — backend returns how many communities (=steps) this export has.
      const startRes = await axios.get("/admin/export/start-export", {
        params: filters,
      });
      const { job_id, total } = startRes.data;
      setProgress({ processed: 0, total, currentCommunity: "" });

      // 2. Process one community per request, sequentially. Must stay
      // sequential (not Promise.all) — concurrent requests would corrupt
      // the shared zip file being built on the server.
      let done = false;
      while (!done) {
        const chunkRes = await axios.get("/admin/export/process-export-chunk", {
          params: { job_id },
        });
        done = chunkRes.data.done;
        setProgress({
          processed: chunkRes.data.processed,
          total: chunkRes.data.total,
          currentCommunity: chunkRes.data.current_community || "",
        });
        if (!done) await sleep(150); // small pacing gap, easy on the free-tier instance
      }

      // 3. Download the finished zip.
      const downloadRes = await axios.get("/admin/export/download-export", {
        params: { job_id },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([downloadRes.data]));
      const link = document.createElement("a");
      link.href = url;
      const filename = `Attendance_Export_${new Date().toISOString().slice(0, 10)}.zip`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert(err.response?.data?.error || "Export failed. Check server logs.");
    } finally {
      setIsExporting(false);
      setProgress({ processed: 0, total: 0, currentCommunity: "" });
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
                disabled={!filters.session_id || isLoadingFilters}
                onChange={(e) => handleFilterChange("region", e.target.value)}
              >
                <option value="">
                  {isLoadingFilters ? "Loading..." : "All Regions"}
                </option>
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
                disabled={!filters.region || isLoadingFilters}
                onChange={(e) => handleFilterChange("district", e.target.value)}
              >
                <option value="">
                  {isLoadingFilters ? "Loading..." : "All Districts"}
                </option>
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
              disabled={!filters.district || isLoadingFilters}
              onChange={(e) =>
                handleFilterChange("community_id", e.target.value)
              }
            >
              <option value="">
                {isLoadingFilters
                  ? "Loading..."
                  : "All Communities in District"}
              </option>
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

          {isExporting && progress.total > 0 && (
            <div style={styles.progressWrap}>
              <div style={styles.progressBarBg}>
                <div
                  style={{
                    ...styles.progressBarFill,
                    width: `${(progress.processed / progress.total) * 100}%`,
                  }}
                />
              </div>
              <span style={styles.progressText}>
                {progress.processed} / {progress.total} communities packaged
                {progress.currentCommunity
                  ? ` — ${progress.currentCommunity}`
                  : ""}
              </span>
            </div>
          )}
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
            {isExporting
              ? progress.total > 0
                ? `Packaging... (${progress.processed}/${progress.total})`
                : "Starting..."
              : "Generate ZIP Package"}
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
  progressWrap: { marginTop: "15px" },
  progressBarBg: {
    width: "100%",
    height: "8px",
    backgroundColor: "#e2e8f0",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#198104",
    borderRadius: "4px",
    transition: "width 0.2s ease",
  },
  progressText: {
    display: "block",
    marginTop: "6px",
    fontSize: "12px",
    color: "#64748b",
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
