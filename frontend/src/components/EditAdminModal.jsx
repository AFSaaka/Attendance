import React, { useState, useEffect } from "react";
import { X, Save, Shield, Mail, User } from "lucide-react";
import axios from "../api/axios";

const EditAdminModal = ({ isOpen, admin, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    user_name: "",
    email: "",
    admin_level: "admin",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (admin) {
      setFormData({
        user_name: admin.user_name || "",
        email: admin.email || "",
        admin_level: admin.admin_level || "admin",
      });
    }
  }, [admin]);

  if (!isOpen || !admin) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/admin/manage-admins", {
        action: "update_details",
        id: admin.id,
        ...formData,
      });
      onUpdate();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={mStyles.overlay}>
      <div style={mStyles.content}>
        <div style={mStyles.header}>
          <h3 style={{ margin: 0 }}>Edit Admin Profile</h3>
          <button onClick={onClose} style={mStyles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={mStyles.form}>
          <div style={mStyles.field}>
            <label style={mStyles.label}>
              <User size={14} /> Full Name
            </label>
            <input
              style={mStyles.input}
              value={formData.user_name}
              onChange={(e) =>
                setFormData({ ...formData, user_name: e.target.value })
              }
              required
            />
          </div>
          <div style={mStyles.field}>
            <label style={mStyles.label}>
              <Mail size={14} /> Email
            </label>
            <input
              type="email"
              style={mStyles.input}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>
          <div style={mStyles.field}>
            <label style={mStyles.label}>
              <Shield size={14} /> Level
            </label>
            <select
              style={mStyles.input}
              value={formData.admin_level}
              onChange={(e) =>
                setFormData({ ...formData, admin_level: e.target.value })
              }
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div style={mStyles.footer}>
            <button type="button" onClick={onClose} style={mStyles.cancel}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={mStyles.save}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const mStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  content: {
    background: "#fff",
    padding: "24px",
    borderRadius: "12px",
    width: "400px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  closeBtn: { background: "none", border: "none", cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  field: { display: "flex", flexDirection: "column", gap: "5px" },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  input: { padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "10px",
  },
  cancel: {
    padding: "8px 16px",
    background: "#f1f5f9",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  save: {
    padding: "8px 16px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};

export default EditAdminModal;
