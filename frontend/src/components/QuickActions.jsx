import React from "react";
import { UserPlus, Users, MapPin, ShieldPlus } from "lucide-react";

const QuickActions = ({ onAction }) => {
  return (
    <div style={styles.container}>
      <button
        style={styles.btn}
        onClick={() => onAction("student")}
        title="Add Student"
      >
        <UserPlus size={20} />
      </button>
      <button
        style={styles.btn}
        onClick={() => onAction("coordinator")}
        title="Add Coordinator"
      >
        <Users size={20} />
      </button>
      <button
        style={styles.btn}
        onClick={() => onAction("community")}
        title="Add Community"
      >
        <MapPin size={20} />
      </button>
      <button
        style={styles.btnPri}
        onClick={() => onAction("admin")}
        title="Add Administrator"
      >
        <ShieldPlus size={20} />
      </button>
    </div>
  );
};

const styles = {
  container: { display: "flex", gap: "12px", marginBottom: "30px" },
  btn: {
    background: "#fff",
    color: "#198104",
    border: "1.5px solid #198104",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  btnPri: {
    background: "#198104",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 6px -1px rgba(25, 129, 4, 0.3)",
  },
};

export default QuickActions;
