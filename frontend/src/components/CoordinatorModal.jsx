import React, { useState } from "react";
import { X, CheckCircle, AlertCircle, Loader2, Upload } from "lucide-react";
import axios from "../api/axios";

const CoordinatorModal = ({ isOpen, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState("bulk"); // 'bulk' or 'single'
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" }); // { type: 'success' | 'error', message: '' }
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
        message: `Successfully uploaded ${res.data.count} coordinators!`,
      });
      setFile(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err.response?.data?.error ||
          "Failed to upload file. Please check format.",
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
        <div style={styles.header}>
          <h2>Add Coordinators</h2>
          <button
            onClick={() => {
              clearStatus();
              onClose();
            }}
            style={styles.closeBtn}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Messages */}
        {status.type && (
          <div
            style={
              status.type === "success" ? styles.successBar : styles.errorBar
            }
          >
            {status.type === "success" ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{status.message}</span>
          </div>
        )}

        <div style={styles.tabNav}>
          <button
            style={activeTab === "bulk" ? styles.activeTab : styles.tab}
            onClick={() => {
              setActiveTab("bulk");
              clearStatus();
            }}
          >
            Bulk Upload (Excel)
          </button>
          <button
            style={activeTab === "single" ? styles.activeTab : styles.tab}
            onClick={() => {
              setActiveTab("single");
              clearStatus();
            }}
          >
            Single Entry
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === "bulk" ? (
            <form onSubmit={handleBulkUpload} style={styles.form}>
              <div style={styles.uploadArea}>
                <Upload size={32} color="#64748b" />
                <p>Select Coordinator Excel File (.xlsx)</p>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                />
              </div>
              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? <Loader2 className="animate-spin" /> : "Upload File"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSingleAdd} style={styles.form}>
              {/* Include your form inputs here for full_name, email, etc. */}
              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? (
                  <Loader2 className="animate-spin" />
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
    backgroundColor: "#fff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "500px",
    overflow: "hidden",
  },
  header: {
    padding: "20px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#666",
  },

  // New Status Bar Styles
  successBar: {
    margin: "15px",
    padding: "12px",
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
  },
  errorBar: {
    margin: "15px",
    padding: "12px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px",
  },

  tabNav: { display: "flex", borderBottom: "1px solid #eee" },
  tab: {
    flex: 1,
    padding: "12px",
    border: "none",
    background: "#f8fafc",
    cursor: "pointer",
    color: "#64748b",
  },
  activeTab: {
    flex: 1,
    padding: "12px",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    color: "#198104",
    fontWeight: "bold",
    borderBottom: "2px solid #198104",
  },
  content: { padding: "20px" },
  uploadArea: {
    border: "2px dashed #e2e8f0",
    borderRadius: "12px",
    padding: "30px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
  },
  submitBtn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#198104",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    display: "flex",
    justifyContent: "center",
  },
};

export default CoordinatorModal;
