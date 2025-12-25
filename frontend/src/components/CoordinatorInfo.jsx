import React from "react";
import { UserCheck, ShieldCheck, MapPin, Phone } from "lucide-react";

const CoordinatorInfo = ({ profile }) => {
  return (
    <div style={styles.container}>
      <div style={styles.profileHeader}>
        <div style={styles.avatar}>{profile.full_name?.charAt(0) || "C"}</div>
        <div>
          <h2 style={styles.name}>
            {profile.full_name}
            {profile.is_email_verified && (
              <ShieldCheck
                size={18}
                color="#16a34a"
                style={{ marginLeft: "8px" }}
              />
            )}
          </h2>
          <p style={styles.email}>{profile.email}</p>
        </div>
      </div>

      <div style={styles.detailGrid}>
        <div style={styles.item}>
          <MapPin size={16} color="#64748b" />
          <span>
            {profile.district}, {profile.region}
          </span>
        </div>
        <div style={styles.item}>
          <Phone size={16} color="#64748b" />
          <span>{profile.phone_number || "No Phone Linked"}</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    background: "#fff",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    marginBottom: "25px",
    width: "100%",
    border: "1px solid #e2e8f0",
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "15px",
  },
  avatar: {
    width: "50px",
    height: "50px",
    background: "#05be1eff",
    color: "white",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: "bold",
  },
  name: {
    margin: 0,
    fontSize: "1.25rem",
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
  },
  email: { margin: 0, color: "#64748b", fontSize: "0.9rem" },
  detailGrid: {
    display: "flex",
    gap: "20px",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "15px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.85rem",
    color: "#334155",
  },
};

export default CoordinatorInfo;
