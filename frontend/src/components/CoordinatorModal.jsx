import React, { useState } from "react";
import {
  X,
  UserCheck,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  Shield,
} from "lucide-react";
import axios from "../api/axios";

const CoordinatorModal = ({ isOpen, onClose, onRefresh }) => {
  const [mode, setMode] = useState("bulk");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    district: "",
    region: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "individual") {
        await axios.post("/admin/add-coordinator", formData);
        alert("Coordinator account created successfully!");
      } else {
        if (!file) throw new Error("Please select an Excel/CSV file.");
        const data = new FormData();
        data.append("coordinator_file", file);
        const res = await axios.post("/admin/bulk-upload-coordinators", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert(`Success! ${res.data.count} Coordinators registered.`);
      }
      onRefresh();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Shield color="#198104" size={24} />
            <h3 style={{ margin: 0 }}>Coordinator Management</h3>
          </div>
          <X
            onClick={onClose}
            style={{ cursor: "pointer", color: "#64748b" }}
          />
        </div>

        <div style={styles.tabContainer}>
          <button
            onClick={() => setMode("bulk")}
            style={mode === "bulk" ? styles.activeTab : styles.tab}
          >
            Bulk Upload
          </button>
          <button
            onClick={() => setMode("individual")}
            style={mode === "individual" ? styles.activeTab : styles.tab}
          >
            Individual Entry
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === "bulk" ? (
            <div style={styles.bulkSection}>
              <div style={styles.infoBox}>
                <AlertCircle size={18} />
                <span>
                  Format: <b>full_name, email, district, region</b> (Password
                  defaults to TTFPP2025)
                </span>
              </div>
              <label style={styles.dropZone}>
                <Upload size={32} color="#94a3b8" />
                <input
                  type="file"
                  accept=".csv, .xlsx"
                  hidden
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <p>
                  {file ? file.name : "Select Coordinator List (Excel/CSV)"}
                </p>
              </label>
            </div>
          ) : (
            <div style={styles.individualSection}>
              <label style={styles.label}>Full Name</label>
              <input
                style={styles.input}
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />

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
            </div>
          )}

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading
              ? "Processing..."
              : mode === "bulk"
              ? "Import All Coordinators"
              : "Create Account"}
          </button>
        </form>
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
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#fff",
    padding: "30px",
    borderRadius: "20px",
    width: "500px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },
  tabContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "25px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "10px",
  },
  tab: {
    background: "none",
    border: "none",
    padding: "10px 20px",
    cursor: "pointer",
    color: "#64748b",
    fontWeight: "600",
  },
  activeTab: {
    background: "none",
    border: "none",
    padding: "10px 20px",
    cursor: "pointer",
    color: "#198104",
    fontWeight: "700",
    borderBottom: "3px solid #198104",
  },
  form: { display: "flex", flexDirection: "column" },
  bulkSection: { padding: "10px 0" },
  infoBox: {
    display: "flex",
    gap: "10px",
    background: "#f0fdf4",
    padding: "12px",
    borderRadius: "10px",
    color: "#166534",
    fontSize: "12px",
    marginBottom: "20px",
  },
  dropZone: {
    border: "2px dashed #cbd5e1",
    padding: "30px",
    borderRadius: "15px",
    textAlign: "center",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    color: "#64748b",
  },
  row: { display: "flex", gap: "10px" },
  label: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#475569",
    marginBottom: "4px",
    textTransform: "uppercase",
  },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    marginBottom: "12px",
    fontSize: "14px",
    width: "100%",
  },
  submitBtn: {
    background: "#198104",
    color: "#fff",
    border: "none",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "10px",
  },
};

export default CoordinatorModal;
