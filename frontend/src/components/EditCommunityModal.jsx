import React, { useState, useEffect } from "react";
import { X, Save, Loader2, Calendar, Clock } from "lucide-react";

const EditCommunityModal = ({
  isOpen,
  onClose,
  onSave,
  community,
  isLoading,
}) => {
  // Initialize with community data or defaults
  const [formData, setFormData] = useState({
    ...community,
    duration_weeks: community?.duration_weeks || 5,
  });

  useEffect(() => {
    if (community) {
      setFormData({
        ...community,
        // Ensure duration defaults to 5 if null/undefined in DB
        duration_weeks: community.duration_weeks ?? 5,
      });
    }
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

          {/* NEW: Timeline Details Row */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Start Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date || ""}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Duration (Weeks)</label>
              <input
                type="number"
                min="1"
                name="duration_weeks"
                value={formData.duration_weeks || ""}
                onChange={handleChange}
                style={styles.input}
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
                placeholder="Optional"
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
                placeholder="Optional"
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
      <style>{` .animate-spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
    </div>
  );
};

const styles = {
  // ... (Styles stay exactly as you had them)
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
    padding: "20px",
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    maxWidth: "480px",
    width: "100%",
    position: "relative",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "12px",
  },
  title: { fontSize: "18px", fontWeight: "700", color: "#0f172a" },
  closeBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#94a3b8",
  },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
    color: "#1e293b",
  },
  footer: { display: "flex", gap: "12px", marginTop: "12px" },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontWeight: "600",
    color: "#64748b",
    cursor: "pointer",
  },
  saveBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#198104", // Using your green theme
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
