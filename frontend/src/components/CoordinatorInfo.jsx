import React, { useState, useEffect } from "react";
import {
  MapPin,
  Phone,
  Calendar, // Changed from Clock to Calendar
  Mail,
  BadgeCheck,
  FileText,
  X,
} from "lucide-react";
import axios from "../api/axios";

const CoordinatorInfo = ({ profile }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [communities, setCommunities] = useState([]);
  const [selectedComm, setSelectedComm] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);

  // Load communities for this district when modal opens
  useEffect(() => {
    if (isModalOpen && profile?.district) {
      axios
        .get(`coordinator/get-communities?district=${profile.district}`)
        .then((res) => {
          // CHALLENGE: Never trust the API blindly.
          // Ensure res.data is actually an array.
          if (Array.isArray(res.data)) {
            setCommunities(res.data);
          } else {
            console.error("API did not return an array:", res.data);
            setCommunities([]); // Fallback to empty array to prevent crash
          }
        })
        .catch((err) => {
          console.error("Failed to load communities", err);
          setCommunities([]); // Fallback on error
        });
    }
  }, [isModalOpen, profile?.district]);

  const handleSave = async () => {
    if (!selectedComm) return alert("Please select a community");
    setLoading(true);
    try {
      await axios.post("/coordinator/set-community-start-date", {
        community_id: selectedComm,
        start_date: startDate,
      });
      alert("Community start date updated!");
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to update start date.");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div style={styles.container}>
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

      <div style={styles.actionGroup}>
        <button style={styles.btnSec}>
          <FileText size={18} /> Reports
        </button>
        <button style={styles.btnPri} onClick={() => setIsModalOpen(true)}>
          <Calendar size={18} /> Set Start Date
        </button>
      </div>

      {/* Activation Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Activate Community</h3>
              <X
                size={20}
                onClick={() => setIsModalOpen(false)}
                style={{ cursor: "pointer" }}
              />
            </div>

            <div style={{ marginTop: "20px" }}>
              <label style={styles.label}>Select Community</label>
              <select
                value={selectedComm}
                onChange={(e) => setSelectedComm(e.target.value)}
                style={styles.select}
              >
                <option value="">-- Choose Community --</option>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Attendance Launch Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.dateInput}
              />

              <button
                style={styles.saveBtn}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Processing..." : "Set Start Date"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  modalContent: {
    background: "#fff",
    padding: "30px",
    borderRadius: "15px",
    width: "400px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
    marginBottom: "8px",
  },
  select: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    marginBottom: "20px",
    fontSize: "14px",
    outline: "none",
  },
  dateInput: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    marginBottom: "25px",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
  },
  saveBtn: {
    width: "100%",
    background: "#05be1e",
    color: "#fff",
    border: "none",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: "700",
    cursor: "pointer",
  },
};

export default CoordinatorInfo;
