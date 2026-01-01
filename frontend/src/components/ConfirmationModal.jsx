import React from "react";
import { AlertTriangle, Info, AlertCircle, X, Loader2 } from "lucide-react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "danger",
  isLoading,
}) => {
  if (!isOpen) return null;

  const themes = {
    danger: {
      color: "#ef4444",
      bg: "#fef2f2",
      icon: <AlertTriangle size={24} />,
    },
    warning: {
      color: "#f59e0b",
      bg: "#fffbeb",
      icon: <AlertCircle size={24} />,
    },
    info: { color: "#3b82f6", bg: "#eff6ff", icon: <Info size={24} /> },
  };

  const activeTheme = themes[type] || themes.danger;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button onClick={onClose} style={styles.closeBtn} disabled={isLoading}>
          <X size={20} />
        </button>

        <div
          style={{
            ...styles.iconWrapper,
            backgroundColor: activeTheme.bg,
            color: activeTheme.color,
          }}
        >
          {activeTheme.icon}
        </div>

        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>

        <div style={styles.footer}>
          <button
            style={styles.cancelBtn}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            style={{ ...styles.confirmBtn, backgroundColor: activeTheme.color }}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Confirm Action"
            )}
          </button>
        </div>
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
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
    maxWidth: "400px",
    width: "100%",
    position: "relative",
    textAlign: "center",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#94a3b8",
  },
  iconWrapper: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: "8px",
  },
  message: {
    fontSize: "14px",
    color: "#64748b",
    lineHeight: "1.5",
    marginBottom: "24px",
  },
  footer: { display: "flex", gap: "12px" },
  cancelBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontWeight: "600",
    cursor: "pointer",
  },
  confirmBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export default ConfirmationModal;
