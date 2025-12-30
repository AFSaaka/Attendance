import React, { useState } from "react";
import {
  X,
  UserPlus,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
} from "lucide-react";
import axios from "../api/axios";

const StudentModal = ({ isOpen, onClose, onRefresh }) => {
  const [mode, setMode] = useState("bulk");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" });
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    uin: "",
    index_number: "",
    full_name: "",
    program: "",
    region: "",
    district: "",
    community: "",
    level: "Level 100",
  });

  const clearStatus = () => setStatus({ type: null, message: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearStatus();

    try {
      if (mode === "individual") {
        await axios.post("/admin/add-student", formData);
        setStatus({
          type: "success",
          message: "Student registered successfully!",
        });
        setFormData({
          uin: "",
          index_number: "",
          full_name: "",
          program: "",
          region: "",
          district: "",
          community: "",
          level: "Level 100",
        });
      } else {
        if (!file) throw new Error("Please select a file.");
        const data = new FormData();
        data.append("student_file", file);
        const res = await axios.post("/admin/bulk-upload", data);
        setStatus({
          type: "success",
          message: `Imported ${res.data.count} students.`,
        });
        setFile(null);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Operation failed",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            {mode === "bulk" ? (
              <FileSpreadsheet color="#198104" size={18} />
            ) : (
              <UserPlus color="#198104" size={18} />
            )}
          </div>
          <div style={{ flex: 1, marginLeft: "12px" }}>
            <h3 style={styles.titleText}>Student Management</h3>
            <p style={styles.subtitleText}>
              {mode === "bulk"
                ? "Import via spreadsheet"
                : "Register manual entry"}
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Improved Tab Switcher */}
        <div style={styles.tabWrapper}>
          <div style={styles.tabContainer}>
            <button
              onClick={() => {
                setMode("bulk");
                clearStatus();
              }}
              style={{
                ...styles.tab,
                ...(mode === "bulk" ? styles.activeTab : {}),
              }}
            >
              Bulk Upload
            </button>
            <button
              onClick={() => {
                setMode("individual");
                clearStatus();
              }}
              style={{
                ...styles.tab,
                ...(mode === "individual" ? styles.activeTab : {}),
              }}
            >
              Manual Entry
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.formContent}>
          {status.type && (
            <div
              style={
                status.type === "success" ? styles.successBar : styles.errorBar
              }
            >
              {status.type === "success" ? (
                <CheckCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {mode === "bulk" ? (
            <div style={styles.bulkBody}>
              <label style={styles.dropZone}>
                <input
                  type="file"
                  hidden
                  onChange={(e) => setFile(e.target.files[0])}
                />
                {file ? (
                  <>
                    <FileText size={32} color="#198104" />
                    <span style={styles.fileName}>{file.name}</span>
                  </>
                ) : (
                  <>
                    <Upload size={32} color="#94a3b8" />
                    <p style={styles.dropText}>Click to browse CSV/Excel</p>
                  </>
                )}
              </label>
            </div>
          ) : (
            <div style={styles.manualBody}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <input
                  style={styles.input}
                  required
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </div>

              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>UIN</label>
                  <input
                    style={styles.input}
                    required
                    value={formData.uin}
                    onChange={(e) =>
                      setFormData({ ...formData, uin: e.target.value })
                    }
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Index No.</label>
                  <input
                    style={styles.input}
                    required
                    value={formData.index_number}
                    onChange={(e) =>
                      setFormData({ ...formData, index_number: e.target.value })
                    }
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Program</label>
                <input
                  style={styles.input}
                  required
                  value={formData.program}
                  onChange={(e) =>
                    setFormData({ ...formData, program: e.target.value })
                  }
                />
              </div>

              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Level</label>
                  <select
                    style={styles.select}
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value })
                    }
                  >
                    <option value="Level 100">100</option>
                    <option value="Level 200">200</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Region</label>
                  <input
                    style={styles.input}
                    required
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                  />
                </div>
              </div>

              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>District</label>
                  <input
                    style={styles.input}
                    required
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({ ...formData, district: e.target.value })
                    }
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Community</label>
                  <input
                    style={styles.input}
                    required
                    value={formData.community}
                    onChange={(e) =>
                      setFormData({ ...formData, community: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            style={loading ? styles.btnDisabled : styles.btnActive}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : mode === "bulk" ? (
              "Upload Students"
            ) : (
              "Save Student"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    backdropFilter: "blur(4px)",
    padding: "16px",
  },
  modal: {
    background: "#fff",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
  },
  iconCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: "#e8f5e6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitleText: { margin: 0, fontSize: "0.8rem", color: "#64748b" },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
  },
  tabWrapper: { padding: "12px 24px 0", backgroundColor: "#f8fafc" },
  tabContainer: {
    display: "flex",
    backgroundColor: "#e2e8f0",
    borderRadius: "10px",
    padding: "4px",
  },
  tab: {
    flex: 1,
    padding: "8px",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#64748b",
    border: "none",
    background: "none",
    cursor: "pointer",
    borderRadius: "8px",
    transition: "0.2s",
  },
  activeTab: {
    background: "#fff",
    color: "#198104",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  formContent: { padding: "24px" },
  field: { marginBottom: "14px" },
  row: { display: "flex", gap: "12px", marginBottom: "14px" },
  label: {
    display: "block",
    fontSize: "0.7rem",
    fontWeight: "700",
    color: "#475569",
    marginBottom: "4px",
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.9rem",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.9rem",
    backgroundColor: "#fff",
  },
  dropZone: {
    border: "2px dashed #cbd5e1",
    padding: "30px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    cursor: "pointer",
    backgroundColor: "#fcfcfc",
  },
  dropText: { marginTop: "10px", fontSize: "0.85rem", color: "#64748b" },
  fileName: {
    fontSize: "0.85rem",
    color: "#198104",
    fontWeight: "600",
    marginTop: "8px",
  },
  btnActive: {
    width: "100%",
    backgroundColor: "#198104",
    color: "#fff",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    marginTop: "10px",
  },
  btnDisabled: {
    width: "100%",
    backgroundColor: "#94a3b8",
    color: "#fff",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "700",
    border: "none",
    cursor: "not-allowed",
    marginTop: "10px",
    display: "flex",
    justifyContent: "center",
  },
  successBar: {
    padding: "10px 12px",
    backgroundColor: "#ecfdf5",
    color: "#065f46",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.8rem",
    marginBottom: "16px",
    border: "1px solid #a7f3d0",
  },
  errorBar: {
    padding: "10px 12px",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.8rem",
    marginBottom: "16px",
    border: "1px solid #fecaca",
  },
};

export default StudentModal;
