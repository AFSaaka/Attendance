import React, { useState } from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  Users,
  FileText,
} from "lucide-react";
import axios from "../api/axios";

const CoordinatorModal = ({ isOpen, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState("bulk");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" });
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    region: "",
    district: "",
  });

  const clearStatus = () => setStatus({ type: null, message: "" });

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    clearStatus();
    const data = new FormData();
    data.append("coordinator_file", file);
    try {
      const res = await axios.post("/admin/bulk-upload-coordinators", data);
      setStatus({
        type: "success",
        message: `Imported ${res.data.count} coordinators!`,
      });
      setFile(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Upload failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSingleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearStatus();
    try {
      await axios.post("/admin/add-coordinator", formData);
      setStatus({
        type: "success",
        message: "Coordinator added successfully!",
      });
      setFormData({
        full_name: "",
        email: "",
        phone_number: "",
        region: "",
        district: "",
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.error || "Failed to add coordinator.",
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
            <Users color="#198104" size={18} />
          </div>
          <div style={{ flex: 1, marginLeft: "12px" }}>
            <h3 style={styles.titleText}>Coordinator Setup</h3>
            <p style={styles.subtitleText}>
              Manage district coordinator access
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Pill Tab Switcher */}
        <div style={styles.tabWrapper}>
          <div style={styles.tabContainer}>
            <button
              onClick={() => {
                setActiveTab("bulk");
                clearStatus();
              }}
              style={{
                ...styles.tab,
                ...(activeTab === "bulk" ? styles.activeTab : {}),
              }}
            >
              Bulk Import
            </button>
            <button
              onClick={() => {
                setActiveTab("single");
                clearStatus();
              }}
              style={{
                ...styles.tab,
                ...(activeTab === "single" ? styles.activeTab : {}),
              }}
            >
              Single Entry
            </button>
          </div>
        </div>

        <div style={styles.formContent}>
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

          {activeTab === "bulk" ? (
            <form onSubmit={handleBulkUpload}>
              <div style={styles.bulkBody}>
                <label style={styles.dropZone}>
                  <input
                    type="file"
                    hidden
                    accept=".xlsx"
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
                      <p style={styles.dropText}>
                        Select Coordinator Excel (.xlsx)
                      </p>
                    </>
                  )}
                </label>
              </div>
              <button
                type="submit"
                style={loading ? styles.btnDisabled : styles.btnActive}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Upload Coordinators"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSingleAdd}>
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

              <div style={styles.field}>
                <label style={styles.label}>Email Address</label>
                <input
                  style={styles.input}
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Phone Number</label>
                <input
                  style={styles.input}
                  required
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                />
              </div>

              <div style={styles.row}>
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
              </div>

              <button
                type="submit"
                style={loading ? styles.btnDisabled : styles.btnActive}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  "Save Coordinator"
                )}
              </button>
            </form>
          )}
        </div>
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

export default CoordinatorModal;
