import React, { useState, useEffect } from "react";
import {
  Search,
  Mail,
  RefreshCw,
  Send,
  Edit,
  CheckCircle,
  Clock,
  UserX,
  UserCheck,
  Loader2,
  MailCheck,
  AlertCircle,
  Calendar,
} from "lucide-react";
import axios from "../api/axios";
import EditAdminModal from "./EditAdminModal";
import ConfirmationModal from "./ConfirmationModal";

const AdminList = ({ currentUser }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- Confirmation Modal State ---
  const [confModal, setConfModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    action: null,
    isLoading: false,
    targetId: null,
    targetName: "",
  });

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/admin/get-admins");
      setAdmins(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch admins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // --- Modal Trigger Logic ---
  const openConfirm = (admin, actionType) => {
    // Edge case: Sending individual invite without OTP
    if (actionType === "send_invite" && !admin.otp_code) {
      setConfModal({
        isOpen: true,
        type: "danger",
        title: "Missing OTP",
        message: `Cannot send invite to ${admin.user_name}. You must 'Refresh OTP' first to generate a secure code.`,
        action: null, // No confirm action possible
        isLoading: false,
      });
      return;
    }

    let config = {
      isOpen: true,
      targetId: admin.id || null,
      targetName: admin.user_name || "all pending admins",
      action: actionType,
      isLoading: false,
    };

    switch (actionType) {
      case "send_invite":
        config = {
          ...config,
          type: "info",
          title: "Send Invitation",
          message: `Send login credentials and setup instructions to ${admin.user_name}?`,
        };
        break;
      case "refresh_otp":
        config = {
          ...config,
          type: "warning",
          title: "Reset Security Code",
          message: `This will invalidate any previous codes sent to ${admin.user_name} and generate a new 48-hour OTP. Continue?`,
        };
        break;
      case "toggle_status":
        const willDisable = admin.is_active;
        config = {
          ...config,
          type: willDisable ? "danger" : "info",
          title: willDisable ? "Disable Account" : "Enable Account",
          message: `Are you sure you want to ${
            willDisable ? "deactivate" : "reactivate"
          } ${admin.user_name}'s access to the system?`,
        };
        break;
      case "send_all_pending":
        const count = admins.filter(
          (a) => a.must_reset_password && a.is_active && a.otp_code
        ).length;
        config = {
          ...config,
          type: "warning",
          title: "Bulk Invitation",
          message: `This will send invitation emails to ${count} active admins who have valid OTP codes. Proceed?`,
        };
        break;
      default:
        break;
    }
    setConfModal(config);
  };

  // --- Final Execution Logic ---
  const handleConfirmedAction = async () => {
    if (!confModal.action) {
      setConfModal((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    setConfModal((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await axios.post("/admin/manage-admins", {
        id: confModal.targetId,
        action: confModal.action,
      });

      // Special handling for new OTP display
      if (confModal.action === "refresh_otp" && res.data.new_otp) {
        alert(`New OTP for ${confModal.targetName}: ${res.data.new_otp}`);
      }

      await fetchAdmins();
      setConfModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
    } catch (err) {
      alert(err.response?.data?.message || "Action failed to complete.");
      setConfModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const filteredAdmins = admins.filter(
    (a) =>
      a.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Dynamic Confirmation Modal */}
      <ConfirmationModal
        isOpen={confModal.isOpen}
        isLoading={confModal.isLoading}
        type={confModal.type}
        title={confModal.title}
        message={confModal.message}
        onClose={() => setConfModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmedAction}
      />

      <div style={styles.header}>
        <div style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <input
            placeholder="Search admins..."
            style={styles.input}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => openConfirm({}, "send_all_pending")}
          style={styles.bulkBtn}
        >
          <MailCheck size={16} />
          Send All Pending
        </button>
      </div>

      <EditAdminModal
        isOpen={isEditModalOpen}
        admin={selectedAdmin}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={fetchAdmins}
      />

      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th>Administrator</th>
            <th>Verification & Invitation</th>
            <th>Status</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAdmins.map((admin) => (
            <tr key={admin.id} style={styles.tr}>
              <td style={styles.td}>
                <div style={styles.name}>{admin.user_name}</div>
                <div style={styles.email}>
                  <Mail size={12} /> {admin.email}
                </div>
              </td>
              <td style={styles.td}>
                {admin.must_reset_password ? (
                  <div>
                    {admin.otp_code ? (
                      <>
                        <div style={styles.pendingStatus}>
                          <Clock size={14} /> Pending Setup
                        </div>
                        <code style={styles.otp}>{admin.otp_code}</code>
                      </>
                    ) : (
                      <div style={styles.errorStatus}>
                        <AlertCircle size={14} /> Missing OTP (Refresh Required)
                      </div>
                    )}

                    {admin.last_invited_at && (
                      <div style={styles.invitedAt}>
                        <Calendar size={12} /> Sent:{" "}
                        {new Date(admin.last_invited_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={styles.verifiedStatus}>
                    <CheckCircle size={14} /> Account Verified
                  </div>
                )}
              </td>
              <td style={styles.td}>
                <span style={admin.is_active ? styles.active : styles.disabled}>
                  {admin.is_active ? "Active" : "Disabled"}
                </span>
              </td>
              <td style={{ ...styles.td, textAlign: "right" }}>
                <button
                  title="Invite"
                  onClick={() => openConfirm(admin, "send_invite")}
                  style={styles.iconBtn}
                >
                  <Send size={16} />
                </button>
                <button
                  title="Refresh OTP"
                  onClick={() => openConfirm(admin, "refresh_otp")}
                  style={styles.iconBtn}
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  title="Edit"
                  onClick={() => {
                    setSelectedAdmin(admin);
                    setIsEditModalOpen(true);
                  }}
                  style={styles.iconBtn}
                >
                  <Edit size={16} />
                </button>
                <button
                  title="Toggle"
                  onClick={() => openConfirm(admin, "toggle_status")}
                  style={{
                    ...styles.iconBtn,
                    color: admin.is_active ? "#ef4444" : "#10b981",
                  }}
                >
                  {admin.is_active ? (
                    <UserX size={16} />
                  ) : (
                    <UserCheck size={16} />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  container: { background: "#fff", borderRadius: "12px", padding: "20px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f8fafc",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    width: "300px",
  },
  input: {
    border: "none",
    background: "transparent",
    outline: "none",
    width: "100%",
  },
  bulkBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#16a34a",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  thead: {
    textAlign: "left",
    color: "#64748b",
    fontSize: "12px",
    borderBottom: "2px solid #f1f5f9",
  },
  tr: { borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px" },
  name: { fontWeight: "600", color: "#1e293b" },
  email: {
    fontSize: "12px",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  otp: {
    background: "#f1f5f9",
    padding: "2px 6px",
    fontSize: "11px",
    borderRadius: "4px",
    marginTop: "4px",
    display: "inline-block",
  },
  pendingStatus: {
    color: "#f59e0b",
    fontSize: "12px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  errorStatus: {
    color: "#ef4444",
    fontSize: "11px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  verifiedStatus: {
    color: "#10b981",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    fontWeight: "600",
  },
  invitedAt: {
    fontSize: "10px",
    color: "#64748b",
    marginTop: "5px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  active: { color: "#10b981", fontWeight: "600", fontSize: "12px" },
  disabled: { color: "#94a3b8", fontWeight: "600", fontSize: "12px" },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    color: "#64748b",
  },
};

export default AdminList;
