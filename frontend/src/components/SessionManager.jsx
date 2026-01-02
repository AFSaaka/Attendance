import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import axios from "../api/axios";
import CreateSessionModal from "./CreateSessionModal";
import ConfirmationModal from "./ConfirmationModal";

const SessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    id: null,
    isLoading: false,
  });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/admin/get-academic-sessions");
      setSessions(res.data.data || []);
    } catch (err) {
      console.error("Fetch Sessions Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    setIsSubmitting(true);
    try {
      await axios.post("/admin/manage_session", {
        action: "create",
        ...formData,
      });
      setModalOpen(false);
      fetchSessions();
    } catch (err) {
      alert("Error creating session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open the confirmation modal instead of native confirm
  const initiateSetCurrent = (id) => {
    setConfirmState({
      isOpen: true,
      id: id,
      isLoading: false,
    });
  };

  const handleConfirmSetCurrent = async () => {
    setConfirmState((prev) => ({ ...prev, isLoading: true }));
    try {
      await axios.post("/admin/manage_session", {
        action: "set_current",
        id: confirmState.id,
      });
      setConfirmState({ isOpen: false, id: null, isLoading: false });
      fetchSessions();
    } catch (err) {
      alert("Error updating session.");
      setConfirmState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading)
    return (
      <div style={styles.loader}>
        <Loader2 className="animate-spin" /> Loading sessions...
      </div>
    );

  return (
    <div style={styles.container}>
      {/* Creation Modal */}
      <CreateSessionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleCreate}
        isLoading={isSubmitting}
      />

      {/* Confirmation Modal for Session Switching */}
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
        onConfirm={handleConfirmSetCurrent}
        title="Switch Academic Session"
        message="Are you sure you want to change the current session? This will affect student registrations and dashboard metrics across the system."
        type="warning"
        isLoading={confirmState.isLoading}
      />

      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>Academic Sessions</h2>
          <p style={styles.subtitle}>
            Define and activate school years for the registration portal.
          </p>
        </div>
        <button style={styles.addBtn} onClick={() => setModalOpen(true)}>
          <Plus size={18} /> New Session
        </button>
      </header>

      <div style={styles.grid}>
        {sessions.map((s) => (
          <div
            key={s.id}
            style={{
              ...styles.card,
              borderColor: s.is_current ? "#16a34a" : "#e2e8f0",
              background: s.is_current
                ? "linear-gradient(to bottom right, #f0fdf4, #ffffff)"
                : "#fff",
            }}
          >
            <div style={styles.cardHeader}>
              <div
                style={{
                  ...styles.iconBox,
                  background: s.is_current ? "#dcfce7" : "#f1f5f9",
                }}
              >
                <Calendar
                  size={20}
                  color={s.is_current ? "#16a34a" : "#64748b"}
                />
              </div>
              {s.is_current && <span style={styles.activeTag}>ACTIVE</span>}
            </div>

            <h3 style={styles.yearText}>
              {s.year_start} - {s.year_end}
            </h3>
            <p style={styles.desc}>
              {s.description || "No description provided."}
            </p>

            <div style={styles.cardFooter}>
              {s.is_current ? (
                <div style={styles.statusBadge}>
                  <CheckCircle2 size={16} /> Current Active Session
                </div>
              ) : (
                <button
                  onClick={() => initiateSetCurrent(s.id)}
                  style={styles.setBtn}
                >
                  Set as Current
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: "32px", maxWidth: "1100px", margin: "0 auto" },
  loader: {
    padding: "100px",
    textAlign: "center",
    color: "#64748b",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  subtitle: { color: "#64748b", fontSize: "14px", marginTop: "4px" },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "transform 0.1s active",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "24px",
  },
  card: {
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    position: "relative",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },
  iconBox: { padding: "10px", borderRadius: "10px" },
  activeTag: {
    background: "#16a34a",
    color: "#fff",
    fontSize: "10px",
    fontWeight: "800",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  yearText: { fontSize: "22px", fontWeight: "700", color: "#1e293b" },
  desc: {
    color: "#64748b",
    marginTop: "8px",
    fontSize: "14px",
    lineHeight: "1.5",
    minHeight: "42px",
  },
  cardFooter: {
    marginTop: "24px",
    paddingTop: "16px",
    borderTop: "1px solid #f1f5f9",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#16a34a",
    fontWeight: "700",
    fontSize: "13px",
  },
  setBtn: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    color: "#475569",
    transition: "all 0.2s",
  },
};

export default SessionManager;
