import React from "react";
import { MapPin, Navigation, ShieldCheck, X, Loader2 } from "lucide-react";

const VerificationModal = ({
  isOpen,
  onClose,
  onVerify,
  location,
  distance,
  isInRange,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  // Helper to determine if we are still waiting for GPS data
  const isLocating = distance === null || location.lat === null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <ShieldCheck size={24} color="#198104" />
            <h2 style={styles.title}>Verification</h2>
          </div>
          <button
            onClick={onClose}
            style={styles.closeBtn}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        <div style={styles.body}>
          <p style={styles.description}>
            To complete today's attendance, please confirm you are still within
            your assigned community zone.
          </p>

          <div
            style={{
              ...styles.statusCard,
              backgroundColor: isLocating
                ? "#f8fafc"
                : isInRange
                  ? "#f0fdf4"
                  : "#fef2f2",
              border: `1px solid ${isLocating ? "#e2e8f0" : isInRange ? "#bcf0da" : "#fecaca"}`,
            }}
          >
            {isLocating ? (
              <Loader2 size={20} color="#64748b" className="spin-animation" />
            ) : (
              <Navigation size={20} color={isInRange ? "#166534" : "#991b1b"} />
            )}

            <div>
              <p
                style={{
                  ...styles.statusText,
                  color: isLocating
                    ? "#64748b"
                    : isInRange
                      ? "#166534"
                      : "#991b1b",
                }}
              >
                {isLocating
                  ? "Locating you..."
                  : isInRange
                    ? "In Range"
                    : "Out of Range"}
              </p>
              <p style={styles.distanceText}>
                {distance !== null
                  ? `${Math.round(distance)}m from community center`
                  : "Acquiring GPS signal..."}
              </p>
            </div>
          </div>

          <button
            onClick={onVerify}
            disabled={!isInRange || isSubmitting || isLocating}
            style={{
              ...styles.submitBtn,
              backgroundColor:
                !isInRange || isSubmitting || isLocating
                  ? "#94a3b8"
                  : "#198104",
              cursor:
                !isInRange || isSubmitting || isLocating
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isSubmitting ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Loader2 size={18} className="spin-animation" /> Verifying...
              </div>
            ) : (
              "Confirm My Presence"
            )}
          </button>

          {!isInRange && !isLocating && (
            <div style={styles.warningBox}>
              <MapPin size={14} />
              <span>Please move closer to the community center.</span>
            </div>
          )}
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
    backgroundColor: "rgba(15, 23, 42, 0.75)", // Slightly darker for focus
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "20px",
    backdropFilter: "blur(4px)", // Modern blur effect
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "24px", // Smoother corners
    width: "100%",
    maxWidth: "400px",
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  header: {
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
  },
  titleGroup: { display: "flex", alignItems: "center", gap: "12px" },
  title: { margin: 0, fontSize: "1.1rem", color: "#0f172a", fontWeight: "700" },
  closeBtn: {
    background: "#f1f5f9",
    border: "none",
    padding: "6px",
    borderRadius: "50%",
    cursor: "pointer",
    color: "#64748b",
    display: "flex",
  },
  body: { padding: "24px" },
  description: {
    color: "#475569",
    fontSize: "0.9rem",
    marginBottom: "20px",
    lineHeight: "1.6",
  },
  statusCard: {
    padding: "16px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    transition: "all 0.3s ease",
  },
  statusText: {
    margin: 0,
    fontWeight: "800",
    fontSize: "0.95rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  distanceText: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#64748b",
    marginTop: "2px",
  },
  submitBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: "14px",
    border: "none",
    color: "white",
    fontWeight: "700",
    fontSize: "1rem",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  warningBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#b91c1c",
    fontSize: "0.85rem",
    textAlign: "center",
    marginTop: "16px",
    fontWeight: "600",
    backgroundColor: "#fef2f2",
    padding: "10px",
    borderRadius: "10px",
  },
};

export default VerificationModal;
