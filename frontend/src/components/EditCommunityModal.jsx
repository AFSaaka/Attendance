import React, { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";

const EditCommunityModal = ({
  isOpen,
  onClose,
  onSave,
  community,
  isLoading,
}) => {
  const [formData, setFormData] = useState({ ...community });

  useEffect(() => {
    if (community) setFormData({ ...community });
  }, [community]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Edit Community</h3>
          <button
            onClick={onClose}
            style={styles.closeBtn}
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Community Name</label>
            <input
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Region</label>
              <input
                name="region"
                value={formData.region || ""}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>District</label>
              <input
                name="district"
                value={formData.district || ""}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Latitude</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude || ""}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Longitude</label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude || ""}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button type="submit" style={styles.saveBtn} disabled={isLoading}>
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Save size={18} /> Save Changes
                </>
              )}
            </button>
          </div>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
    padding: "20px",
  },
  modal: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    maxWidth: "450px",
    width: "100%",
    position: "relative",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: { fontSize: "18px", fontWeight: "700", color: "#1e293b" },
  closeBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#94a3b8",
  },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#64748b" },
  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
  },
  footer: { display: "flex", gap: "12px", marginTop: "8px" },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  saveBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
};

export default EditCommunityModal;
