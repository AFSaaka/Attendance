import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Loader2,
  User,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import axios from "../api/axios";

const EditStudentModal = ({ isOpen, onClose, student, onUpdateSuccess }) => {
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState("idle"); // idle, saving, success, error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (student) {
      setFormData({ ...student });
      setStatus("idle");
      setErrorMessage("");
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      // Use clean payload logic to match PHP expectation
      const payload = {
        id: formData.id,
        full_name: formData.full_name?.trim(),
        uin: formData.uin?.trim(),
        index_number: formData.index_number?.trim(),
        program: formData.program,
        level: formData.level,
        region: formData.region,
        district: formData.district,
        community: formData.community,
      };

      const res = await axios.post("/admin/update-student", payload);

      if (res.data.success) {
        setStatus("success");
        // Wait 1.5 seconds to show success message before closing
        setTimeout(() => {
          onUpdateSuccess();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err.response?.data?.error || "Connection error. Please try again."
      );
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={styles.modalHeader}>
          <div style={styles.headerTitle}>
            <div style={styles.iconBox}>
              <User size={18} color="#198104" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px" }}>
                Edit Student Record
              </h3>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Registry ID: {student.id}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={styles.btnClose}
            disabled={status === "saving"}
          >
            <X size={20} />
          </button>
        </div>

        {/* FEEDBACK MESSAGES */}
        {status === "error" && (
          <div style={styles.errorBanner}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {status === "success" && (
          <div style={styles.successBanner}>
            <CheckCircle2 size={16} />
            <span>Record updated successfully! Syncing list...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.sectionDivider}>
            <User size={12} /> Identity
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              name="full_name"
              style={styles.input}
              value={formData.full_name || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>UIN</label>
              <input
                name="uin"
                style={styles.input}
                value={formData.uin || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Index Number</label>
              <input
                name="index_number"
                style={styles.input}
                value={formData.index_number || ""}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div style={styles.sectionDivider}>
            <GraduationCap size={12} /> Academic & Posting
          </div>
          <div style={styles.formRow}>
            <div style={{ ...styles.formGroup, flex: 2 }}>
              <label style={styles.label}>Program</label>
              <input
                name="program"
                style={styles.input}
                value={formData.program || ""}
                onChange={handleChange}
              />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Level</label>
              <select
                name="level"
                style={styles.input}
                value={formData.level || ""}
                onChange={handleChange}
              >
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="300">300</option>
                <option value="400">400</option>
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Region</label>
              <input
                name="region"
                style={styles.input}
                value={formData.region || ""}
                onChange={handleChange}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>District</label>
              <input
                name="district"
                style={styles.input}
                value={formData.district || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Community</label>
            <input
              name="community"
              style={styles.input}
              value={formData.community || ""}
              onChange={handleChange}
            />
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.btnCancel}
              disabled={status === "saving"}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.btnSave,
                background: status === "success" ? "#16a34a" : "#198104",
                opacity: status === "saving" ? 0.7 : 1,
              }}
              disabled={status === "saving" || status === "success"}
            >
              {status === "saving" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : status === "success" ? (
                <>
                  <CheckCircle2 size={18} /> Done!
                </>
              ) : (
                <>
                  <Save size={18} /> Save Changes
                </>
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
  // ... (All previous styles kept here)
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  modalContent: {
    background: "#fff",
    width: "100%",
    maxWidth: "480px",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  headerTitle: { display: "flex", alignItems: "center", gap: "12px" },
  iconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: "#f0fdf4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
  },
  sectionDivider: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#198104",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    margin: "10px 0",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "4px",
  },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  formRow: { display: "flex", gap: "12px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
  label: { fontSize: "11px", fontWeight: "600", color: "#64748b" },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
  },

  // NEW STYLES
  errorBanner: {
    padding: "12px",
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "15px",
    border: "1px solid #fee2e2",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  successBanner: {
    padding: "12px",
    backgroundColor: "#f0fdf4",
    color: "#166534",
    borderRadius: "8px",
    fontSize: "13px",
    marginBottom: "15px",
    border: "1px solid #dcfce7",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  footer: { display: "flex", gap: "10px", marginTop: "20px" },
  btnCancel: {
    flex: 1,
    padding: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    color: "#64748b",
  },
  btnSave: {
    flex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s",
  },
};

export default EditStudentModal;
