import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { Download, X, FileText, Archive, AlertCircle } from "lucide-react";

const AttendanceExportModal = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [filters, setFilters] = useState({
    session_id: "",
    region: "",
    district: "",
    community_id: "",
  });
  const [isExporting, setIsExporting] = useState(false);

  // Load available sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await axios.get("/admin/get-sessions");
        setSessions(res.data);
        // Default to the current session if available
        const current = res.data.find((s) => s.is_current);
        if (current) setFilters((f) => ({ ...f, session_id: current.id }));
      } catch (err) {
        console.error("Failed to load sessions");
      }
    };
    if (isOpen) fetchSessions();
  }, [isOpen]);

  const handleDownload = () => {
    if (!filters.session_id) return alert("Please select an Academic Session");

    setIsExporting(true);

    // Construct Query String
    const params = new URLSearchParams(filters).toString();
    const downloadUrl = `${axios.defaults.baseURL}/admin/export-attendance?${params}`;

    // Use window.location to trigger the PHP attachment download
    window.location.href = downloadUrl;

    // Give it a moment before enabling the button again
    setTimeout(() => setIsExporting(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Archive size={20} /> Attendance Export Center
          </h2>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.body}>
          <p style={styles.info}>
            Select the scope of the export. Large requests (e.g., entire
            Regions) may take a few moments to package into a ZIP file.
          </p>

          <div style={styles.formGroup}>
            <label style={styles.label}>Academic Session *</label>
            <select
              style={styles.select}
              value={filters.session_id}
              onChange={(e) =>
                setFilters({ ...filters, session_id: e.target.value })
              }
            >
              <option value="">Select Session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.year_start}/{s.year_end} - {s.description}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Region (Optional)</label>
              <input
                style={styles.input}
                placeholder="e.g. Northern"
                onChange={(e) =>
                  setFilters({ ...filters, region: e.target.value })
                }
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>District (Optional)</label>
              <input
                style={styles.input}
                placeholder="e.g. Savelugu"
                onChange={(e) =>
                  setFilters({ ...filters, district: e.target.value })
                }
              />
            </div>
          </div>

          <div style={styles.warningBox}>
            <AlertCircle size={16} color="#854d0e" />
            <span>
              Files will be organized as: <b>Region - District - Community</b>
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
            {isExporting ? "Generating ZIP..." : "Download Attendance Package"}
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
