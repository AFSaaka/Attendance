import React, { useState } from "react";
import {
  X,
  UserPlus,
  FileSpreadsheet,
  Upload,
  AlertCircle,
} from "lucide-react";
import axios from "../api/axios";

const StudentModal = ({ isOpen, onClose, onRefresh }) => {
  // Mode state: 'bulk' or 'individual'
  const [mode, setMode] = useState("bulk");
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "individual") {
        await axios.post("/admin/add-student", formData);
        alert("Student registered and enrolled successfully!");
      } else {
        if (!file) throw new Error("Please select a CSV file first.");
        const data = new FormData();
        data.append("student_file", file);
        const res = await axios.post("/admin/bulk-upload", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert(`Success! ${res.data.count || ""} Students processed.`);
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
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {mode === "bulk" ? (
              <FileSpreadsheet color="#198104" size={24} />
            ) : (
              <UserPlus color="#198104" size={24} />
            )}
            <h3 style={{ margin: 0 }}>Student Management</h3>
          </div>
          <X
            onClick={onClose}
            style={{ cursor: "pointer", color: "#64748b" }}
          />
        </div>

        {/* Mode Toggle Tabs */}
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
            /* BULK UPLOAD UI */
            <div style={styles.bulkSection}>
              <div style={styles.infoBox}>
                <AlertCircle size={18} />
                <span>
                  Upload <b>Excel (.xlsx)</b> or <b>CSV</b> with: uin,
                  index_number, full_name, program, region, district, community,
                  level
                </span>
              </div>
              <label style={styles.dropZone}>
                <Upload size={32} color="#94a3b8" />
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  hidden
                  onChange={(e) => setFile(e.target.files[0])}
                />
                <p>
                  {file
                    ? file.name
                    : "Click to browse or drag Student CSV here"}
                </p>
              </label>
            </div>
          ) : (
            /* INDIVIDUAL ENTRY UI (Your existing code) */
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
                  <label style={styles.label}>Index Number</label>
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

              <div style={styles.row}>
                <div style={{ flex: 1 }}>
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
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Level</label>
                  <select
                    style={styles.input}
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value })
                    }
                  >
                    <option value="Level 100">100</option>
                    <option value="Level 200">200</option>
                    <option value="Level 300">300</option>
                  </select>
                </div>
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

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading
              ? "Processing..."
              : mode === "bulk"
              ? "Upload & Enroll All"
              : "Register Student"}
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
    width: "650px",
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
    background: "#f0f9ff",
    padding: "12px",
    borderRadius: "10px",
    color: "#0369a1",
    fontSize: "12px",
    marginBottom: "20px",
  },
  dropZone: {
    border: "2px dashed #cbd5e1",
    padding: "40px",
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

export default StudentModal;
