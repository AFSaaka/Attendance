import React from "react";
import {
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  BadgeCheck,
  FileText,
  CheckSquare,
} from "lucide-react";

const CoordinatorInfo = ({ profile }) => {
  if (!profile) return null;

  return (
    <div style={styles.container}>
      {/* Left Side: Profile Details */}
      <div style={styles.leftContent}>
        <div style={styles.avatar}>
          {profile.full_name?.charAt(0) || "C"}
          <div style={styles.onlineStatus} />
        </div>

        <div style={styles.textDetails}>
          <div style={styles.nameRow}>
            <h2 style={styles.name}>{profile.full_name}</h2>
            <div style={styles.roleBadge}>
              <BadgeCheck size={14} /> Coordinator
            </div>
          </div>

          <div style={styles.metaRow}>
            <div style={styles.metaItem}>
              <Mail size={14} /> {profile.email}
            </div>
            <div style={styles.metaItem}>
              <MapPin size={14} /> {profile.district}
            </div>
            <div style={styles.metaItem}>
              <Phone size={14} /> {profile.phone_number || "No Phone"}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Action Buttons */}
      <div style={styles.actionGroup}>
        <button style={styles.btnSec}>
          <FileText size={18} /> Reports
        </button>
        <button style={styles.btnPri}>
          <CheckSquare size={18} /> Bulk Approve
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    // FIX: Using a professional background color to break up the white
    background: "linear-gradient(135deg, #e0ebff 30%, #68634dff 100%)",
    padding: "24px 30px",
    borderRadius: "20px",
    border: "1px solid #cbd5e1",
    display: "flex", // Flexbox to separate left and right
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    height: "25vh",
    boxSizing: "border-box",
    marginBottom: "30px",
  },
  leftContent: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  avatar: {
    position: "relative",
    width: "60px",
    height: "60px",
    background: "#05be1e",
    color: "white",
    borderRadius: "50%", // Circular looks better with colored backgrounds
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.6rem",
    fontWeight: "800",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },
  onlineStatus: {
    position: "absolute",
    bottom: "2px",
    right: "2px",
    width: "12px",
    height: "12px",
    backgroundColor: "#22c55e",
    border: "2px solid #f0f7ff",
    borderRadius: "50%",
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "6px",
  },
  name: {
    margin: 0,
    fontSize: "1.3rem",
    color: "#0f172a",
    fontWeight: "700",
  },
  roleBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 10px",
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: "20px",
    fontSize: "0.7rem",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaRow: {
    display: "flex",
    gap: "15px",
    flexWrap: "wrap",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#475569",
    fontSize: "0.85rem",
  },
  actionGroup: {
    display: "flex",
    gap: "12px",
  },
  btnPri: {
    background: "#05be1e",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(5, 190, 30, 0.3)",
  },
  btnSec: {
    background: "#fff",
    color: "#1e293b",
    border: "1px solid #cbd5e1",
    padding: "10px 20px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default CoordinatorInfo;
