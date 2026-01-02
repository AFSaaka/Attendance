import React from "react";
import {
  Mail,
  Shield,
  User,
  UserPlus,
  Users,
  MapPin,
  ShieldPlus, // Ensure this is imported
} from "lucide-react";

const AdminHeader = ({ user, onAction }) => {
  return (
    <div style={styles.container}>
      {/* Left Side: Identity Info */}
      <div style={styles.leftSide}>
        <h1 style={styles.title}>System Administrator</h1>
        <div style={styles.infoRow}>
          <div style={styles.badge}>
            <User size={14} /> <span>{user?.user_name || "Admin"}</span>
          </div>
          <div style={styles.badgeSecondary}>
            <Mail size={14} /> <span>{user?.email}</span>
          </div>
          <div style={styles.badgeAccent}>
            <Shield size={14} /> <span>{user?.admin_level || "admin"}</span>
          </div>
        </div>
      </div>

      {/* Right Side: Quick Actions */}
      <div style={styles.actionGroup}>
        <button
          style={styles.btn}
          onClick={() => onAction("student")}
          title="Add Student"
        >
          <UserPlus size={20} />
        </button>

        <button
          style={styles.btn}
          onClick={() => onAction("community")}
          title="Add Community"
        >
          <MapPin size={20} />
        </button>

        {/* PROTECTED: Changed headerStyles to styles and used btnPri to match your style object */}
        {user?.admin_level === "super_admin" && (
          <button
            onClick={() => onAction("admin")}
            style={styles.btnPri}
            title="Add System Admin"
          >
            <ShieldPlus size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: "linear-gradient(135deg, #037e22ff 0%, #515352ff 100%)",
    padding: "50px",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  },
  leftSide: { display: "flex", flexDirection: "column", gap: "10px" },
  title: {
    color: "#ffffffff",
    margin: 0,
    fontSize: "1.8rem",
    fontWeight: "800",
    letterSpacing: "-0.025em",
  },
  infoRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "600",
    border: "1px solid #b9f6ca",
  },
  badgeSecondary: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    background: "#fff",
    color: "#475569",
    borderRadius: "20px",
    fontSize: "0.85rem",
    border: "1px solid #e2e8f0",
  },
  badgeAccent: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    background: "#fef9c3",
    color: "#854d0e",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "600",
    border: "1px solid #fef08a",
  },
  actionGroup: { display: "flex", gap: "10px" },
  btn: {
    background: "#ffffffff",
    color: "#05850fff",
    border: "1.5px solid #ffffffff",
    padding: "12px",
    borderRadius: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  btnPri: {
    background: "#198104",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(25, 129, 4, 0.2)",
  },
};

export default AdminHeader;
