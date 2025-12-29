import React, { useState } from "react";
import {
  X,
  Upload,
  Plus,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import axios from "../api/axios";

const CommunityModal = ({ isOpen, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState("single");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    region: "",
    district: "",
    latitude: "",
    longitude: "",
  });

  const [file, setFile] = useState(null);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetModal = () => {
    setFormData({
      name: "",
      region: "",
      district: "",
      latitude: "",
      longitude: "",
    });
    setFile(null);
    setStatus(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      if (activeTab === "single") {
        await axios.post("/admin/add-community-single", formData);
      } else {
        if (!file) throw new Error("Please select a file first.");

        const data = new FormData();
        // Ensure "file" matches the PHP: if (!isset($_FILES['file']))
        data.append("file", file);

        await axios.post("/admin/upload-communities", data, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      setStatus({ type: "success", message: "Data saved successfully!" });
      if (onRefresh) onRefresh();
      // Reset after success
      setTimeout(resetModal, 2000);
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err.response?.data?.error || err.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={styles.iconCircle}>
              <Plus size={20} color="#198104" />
            </div>
            <h3 style={{ margin: 0 }}>Add Community</h3>
          </div>
          <X
            onClick={resetModal}
            style={{ cursor: "pointer", color: "#94a3b8" }}
          />
        </div>

        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "single" ? styles.activeTab : {}),
            }}
            onClick={() => {
              setActiveTab("single");
              setStatus(null);
            }}
          >
            <Plus size={16} /> Individual
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === "bulk" ? styles.activeTab : {}),
            }}
            onClick={() => {
              setActiveTab("bulk");
              setStatus(null);
            }}
          >
            <Upload size={16} /> Bulk Upload
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.body}>
          {status && (
            <div
              style={
                status.type === "success"
                  ? styles.successAlert
                  : styles.errorAlert
              }
            >
              {status.type === "success" ? (
                <CheckCircle size={18} />
              ) : (
                <XCircle size={18} />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {activeTab === "single" ? (
            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Community Name</label>
                <input
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Abokobi"
                  style={styles.input}
                />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Region</label>
                  <input
                    name="region"
                    required
                    value={formData.region}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>District</label>
                  <input
                    name="district"
                    required
                    value={formData.district}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Lat (Optional)</label>
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Lng (Optional)</label>
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.dropzone}>
              <input
                type="file"
                accept=".csv, .xlsx, .xls" // Key change: added Excel extensions
                id="file-upload"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files[0])}
              />
              <label
                htmlFor="file-upload"
                style={{ cursor: "pointer", display: "block" }}
              >
                <div style={styles.uploadIconWrapper}>
                  <FileText size={32} color={file ? "#198104" : "#64748b"} />
                </div>
                <p
                  style={{
                    fontWeight: "600",
                    color: "#1e293b",
                    marginTop: "12px",
                  }}
                >
                  {file ? file.name : "Click to select CSV or Excel file"}
                </p>
                <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Supports .xlsx, .xls, and .csv
                </p>
              </label>
            </div>
          )}

          <div style={styles.footer}>
            <button type="button" onClick={resetModal} style={styles.btnCancel}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={styles.btnConfirm}>
              {loading ? (
                <Loader2 size={16} className="spin-animate" />
              ) : (
                "Save Community"
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-animate { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    width: "100%",
    maxWidth: "520px",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "#f0fdf4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tabContainer: {
    display: "flex",
    padding: "12px 24px",
    background: "#f8fafc",
    gap: "8px",
  },
  tab: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "600",
    color: "#64748b",
    background: "transparent",
    transition: "all 0.2s",
  },
  activeTab: {
    background: "#fff",
    color: "#198104",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  body: { padding: "24px" },
  formGrid: { display: "flex", flexDirection: "column", gap: "16px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px", flex: 1 },
  label: { fontSize: "13px", fontWeight: "600", color: "#475569" },
  input: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
  },
  dropzone: {
    border: "2px dashed #e2e8f0",
    padding: "40px",
    textAlign: "center",
    borderRadius: "14px",
    background: "#f8fafc",
  },
  uploadIconWrapper: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
  },
  footer: {
    marginTop: "24px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  btnCancel: {
    padding: "10px 20px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "white",
    cursor: "pointer",
    fontWeight: "600",
    color: "#64748b",
  },
  btnConfirm: {
    padding: "10px 24px",
    borderRadius: "10px",
    border: "none",
    background: "#198104",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    marginBottom: "20px",
  },
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    marginBottom: "20px",
  },
};

export default CommunityModal;
