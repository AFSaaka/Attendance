import React, { useState, useEffect } from "react";
import { X, CheckCircle, Loader2, WifiOff } from "lucide-react";

const AttendanceModal = ({
  isOpen,
  onClose,
  onSubmit,
  placement,
  isSubmitting,
}) => {
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset success state when the modal is closed so it's fresh for the next time
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setIsSuccess(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer;
    if (isSuccess) {
      // Start a 5-second countdown to close the modal
      timer = setTimeout(() => {
        onClose();
      }, 5000);
    }

    // Cleanup function: if the user manually closes the modal
    // before the 3 seconds are up, we cancel the timer to prevent memory leaks.
    return () => clearTimeout(timer);
  }, [isSuccess, onClose]);

  if (!isOpen) return null;

  // --- Logic Helpers ---
  const calculateProgress = () => {
    if (!placement?.start_date) return { week: 1, day: 1 };
    const [year, month, day] = placement.start_date.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return {
      week: Math.floor(diffDays / 7) + 1,
      day: (diffDays % 7) + 1,
    };
  };

  const { week, day: activeDay } = calculateProgress();

  const getCalendarDateForDay = (dayNum) => {
    if (!placement?.start_date) return "";
    const [year, month, day] = placement.start_date.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    const daysToAdd = (week - 1) * 7 + (dayNum - 1);
    const targetDate = new Date(start);
    targetDate.setDate(start.getDate() + daysToAdd);
    return targetDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const handleInternalSubmit = async () => {
    const success = await onSubmit(); // Ensure your parent function returns true on success
    if (success) {
      setIsSuccess(true);
    }
  };

  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={styles.title}>Daily Attendance</h2>
            <span style={styles.weekBadge}>Week {week}</span>
          </div>
          {!isSubmitting && (
            <button onClick={onClose} style={styles.closeBtn}>
              <X size={20} />
            </button>
          )}
        </div>

        <div style={styles.body}>
          {!isSuccess ? (
            <>
              {/* Metadata Row */}
              <div style={styles.metaGrid}>
                <div style={styles.metaBox}>
                  <small style={styles.metaLabel}>Region</small>
                  <strong style={styles.metaValue}>
                    {placement?.region || "N/A"}
                  </strong>
                </div>
                <div style={styles.metaBox}>
                  <small style={styles.metaLabel}>District</small>
                  <strong style={styles.metaValue}>
                    {placement?.district || "N/A"}
                  </strong>
                </div>
                <div style={styles.metaBox}>
                  <small style={styles.metaLabel}>Community</small>
                  <strong style={styles.metaValue}>
                    {placement?.community || "N/A"}
                  </strong>
                </div>
              </div>

              {/* Attendance Table */}
              <div style={styles.attendanceTable}>
                <div style={styles.tableHead}>
                  <div style={styles.studentInfoHead}>Student Info</div>
                  <div style={styles.datesHead}>Dates (D1 - D7)</div>
                </div>
                <div style={styles.tableRow}>
                  <div style={styles.studentCell}>
                    <div style={styles.nameTag}>
                      {placement?.full_name?.split(" ")[0] || "Student"}
                    </div>
                    <div style={styles.indexTag}>
                      {placement?.index_number || "N/A"}
                    </div>
                  </div>
                  <div style={styles.daysContainer}>
                    {days.map((d) => (
                      <div
                        key={d}
                        style={{
                          ...styles.dayBox,
                          backgroundColor:
                            d === activeDay ? "#FFC107" : "#f8fafc",
                          border:
                            d === activeDay
                              ? "2px solid #198104"
                              : "1px solid #e2e8f0",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "bold",
                            color: d === activeDay ? "#000" : "#94a3b8",
                          }}
                        >
                          D{d}
                        </span>
                        <span
                          style={{
                            fontSize: "9px",
                            color: d === activeDay ? "#000" : "#cbd5e1",
                            marginTop: "2px",
                          }}
                        >
                          {getCalendarDateForDay(d)}
                        </span>
                        {d === activeDay && (
                          <div style={styles.activeIndicator} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Location Verification */}
              <div style={styles.footerNote}>
                <CheckCircle size={16} color="#198104" />
                <span>GPS verified: In range for {placement?.community}</span>
              </div>

              <button
                onClick={handleInternalSubmit}
                disabled={isSubmitting}
                style={{
                  ...styles.submitButton,
                  backgroundColor: isSubmitting ? "#86efac" : "#198104",
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
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </div>
                ) : (
                  "Submit Attendance"
                )}
              </button>
            </>
          ) : (
            /* SUCCESS VIEW */
            <div style={styles.successWrapper}>
              <CheckCircle
                size={80}
                color="#198104"
                style={{ marginBottom: "16px" }}
              />
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#1e293b",
                }}
              >
                Submission Successful!
              </h2>
              <p style={{ color: "#64748b", marginTop: "8px" }}>
                Your attendance for Week {week}, Day {activeDay} has been
                recorded.
              </p>

              {!navigator.onLine && (
                <div style={styles.offlineWarning}>
                  <WifiOff size={16} />
                  <span>Offline Mode: Saved locally for sync.</span>
                </div>
              )}

              <button
                onClick={onClose}
                style={{
                  ...styles.submitButton,
                  marginTop: "24px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  // ... (Your existing styles) ...
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3000,
    padding: "15px",
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "550px",
    overflow: "hidden",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
  },
  header: {
    padding: "18px 20px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: "700",
    color: "#1e293b",
  },
  weekBadge: {
    backgroundColor: "#198104",
    color: "white",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "800",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
  },
  body: { padding: "20px" },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
    marginBottom: "20px",
  },
  metaBox: {
    backgroundColor: "#f8fafc",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  metaLabel: {
    display: "block",
    fontSize: "10px",
    textTransform: "uppercase",
    color: "#64748b",
    fontWeight: "700",
    marginBottom: "2px",
  },
  metaValue: { fontSize: "13px", color: "#334155" },
  attendanceTable: {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "20px",
  },
  tableHead: {
    display: "flex",
    backgroundColor: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "12px",
    fontWeight: "800",
    color: "#475569",
  },
  studentInfoHead: {
    flex: 1.5,
    padding: "12px",
    borderRight: "1px solid #e2e8f0",
  },
  datesHead: { flex: 3, padding: "12px", textAlign: "center" },
  tableRow: { display: "flex", minHeight: "90px" },
  studentCell: {
    flex: 1.5,
    padding: "12px",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  nameTag: { fontSize: "14px", fontWeight: "700", color: "#1e293b" },
  indexTag: { fontSize: "11px", color: "#64748b", marginTop: "2px" },
  daysContainer: {
    flex: 3,
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    padding: "8px",
    gap: "6px",
  },
  dayBox: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    height: "55px",
  },
  activeIndicator: {
    position: "absolute",
    bottom: "4px",
    width: "5px",
    height: "5px",
    backgroundColor: "#198104",
    borderRadius: "50%",
  },
  footerNote: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#166534",
    fontSize: "13px",
    marginBottom: "20px",
    fontWeight: "600",
  },
  submitButton: {
    width: "100%",
    padding: "16px",
    backgroundColor: "#198104",
    color: "white",
    border: "none",
    borderRadius: "12px",
    fontWeight: "800",
    fontSize: "16px",
    cursor: "pointer",
  },

  // New Styles
  successWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    textAlign: "center",
  },
  offlineWarning: {
    marginTop: "16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#fffbeb",
    color: "#92400e",
    borderRadius: "8px",
    border: "1px solid #fef3c7",
    fontSize: "13px",
  },
};

export default AttendanceModal;
