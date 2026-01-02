import React, { useState } from "react";
import { X, Save, AlertTriangle } from "lucide-react";

const CreateSessionModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [formData, setFormData] = useState({
    year_start: new Date().getFullYear(),
    year_end: new Date().getFullYear() + 1,
    description: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.year_end <= formData.year_start) {
      alert("End year must be after start year.");
      return;
    }
    onSave(formData);
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>Create Academic Session</h3>
          <button onClick={onClose} style={modalStyles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.row}>
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>Start Year</label>
              <input
                type="number"
                required
                style={modalStyles.input}
                value={formData.year_start}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    year_start: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div style={modalStyles.field}>
              <label style={modalStyles.label}>End Year</label>
              <input
                type="number"
                required
                style={modalStyles.input}
                value={formData.year_end}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    year_end: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div style={modalStyles.field}>
            <label style={modalStyles.label}>
              Description (e.g., 2025/2026 Academic Year)
            </label>
            <input
              type="text"
              placeholder="Optional notes..."
              style={modalStyles.input}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div style={modalStyles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={modalStyles.saveBtn}
            >
              {isLoading ? (
                "Creating..."
              ) : (
                <>
                  <Save size={18} /> Create Session
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "450px",
    overflow: "hidden",
  },
  header: {
    padding: "20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: "18px", fontWeight: "700", color: "#1e293b" },
  closeBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#64748b",
  },
  form: { padding: "20px" },
  row: { display: "flex", gap: "16px", marginBottom: "16px" },
  field: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "16px",
  },
  label: { fontSize: "13px", fontWeight: "600", color: "#64748b" },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "10px",
  },
  cancelBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
  },
  saveBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "600",
  },
};

export default CreateSessionModal;
