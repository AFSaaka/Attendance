import React, { useState } from "react";
import {
  X,
  Upload,
  Plus,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
} from "lucide-react";
import axios from "../api/axios";

const CommunityModal = ({ isOpen, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState("single");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    region: "",
    district: "",
    latitude: "",
    longitude: "",
  });

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
        data.append("file", file);
        await axios.post("/admin/upload-communities", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setStatus({
        type: "success",
        message: "Community data saved successfully!",
      });
      if (onRefresh) onRefresh();
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
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <MapPin color="#198104" size={18} />
          </div>
          <div style={{ flex: 1, marginLeft: "12px" }}>
            <h3 style={styles.titleText}>Community Setup</h3>
            <p style={styles.subtitleText}>
              Add locations for student assignment
            </p>
          </div>
          <button onClick={resetModal} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Pill Tab Switcher */}
        <div style={styles.tabWrapper}>
          <div style={styles.tabContainer}>
            <button
              type="button"
              onClick={() => {
                setActiveTab("single");
                setStatus(null);
              }}
              style={{
                ...styles.tab,
                ...(activeTab === "single" ? styles.activeTab : {}),
              }}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("bulk");
                setStatus(null);
              }}
              style={{
                ...styles.tab,
                ...(activeTab === "bulk" ? styles.activeTab : {}),
              }}
            >
              Bulk Upload
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.formContent}>
          {status && (
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

          {activeTab === "single" ? (
            <div style={styles.manualBody}>
              <div style={styles.field}>
                <label style={styles.label}>Community Name</label>
                <input
                  name="name"
                  style={styles.input}
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Abokobi"
                />
              </div>

              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Region</label>
                  <input
                    name="region"
                    style={styles.input}
                    required
                    value={formData.region}
                    onChange={handleInputChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>District</label>
                  <input
                    name="district"
                    style={styles.input}
                    required
                    value={formData.district}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Latitude (Optional)</label>
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    style={styles.input}
                    value={formData.latitude}
                    onChange={handleInputChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Longitude (Optional)</label>
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    style={styles.input}
                    value={formData.longitude}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.bulkBody}>
              <label style={styles.dropZone}>
                <input
                  type="file"
                  hidden
                  accept=".csv, .xlsx, .xls"
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
                    <p style={styles.dropText}>Click to select CSV or Excel</p>
                  </>
                )}
              </label>
            </div>
          )}

          <div style={styles.footer}>
            <button type="button" onClick={resetModal} style={styles.btnCancel}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={loading ? styles.btnDisabled : styles.btnActive}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Save Community"
              )}
            </button>
          </div>
        </form>
      </div>
      <style>{` .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
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
  footer: { display: "flex", gap: "12px", marginTop: "10px" },
  btnCancel: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontWeight: "700",
    color: "#64748b",
    cursor: "pointer",
  },
  btnActive: {
    flex: 2,
    backgroundColor: "#198104",
    color: "#fff",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "700",
    border: "none",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    flex: 2,
    backgroundColor: "#94a3b8",
    color: "#fff",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "700",
    border: "none",
    cursor: "not-allowed",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
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

export default CommunityModal;
