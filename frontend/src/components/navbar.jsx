import { useState } from "react";
import udsLogo from "../assets/udslogo.ico";

// ── Logout confirmation modal (student-only) ──────────────────────────────────
const LogoutConfirmModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        {/* Icon */}
        <div style={modalStyles.iconWrap}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>

        <h3 style={modalStyles.title}>Sign Out?</h3>

        <p style={modalStyles.message}>
          Your offline session will be cleared. If you're in an area with poor
          internet, <strong>you may not be able to sign back in</strong> until
          you have a stable connection.
        </p>

        <p style={modalStyles.warning}>Are you sure you want to sign out?</p>

        <div style={modalStyles.footer}>
          <button style={modalStyles.cancelBtn} onClick={onCancel}>
            Stay Signed In
          </button>
          <button style={modalStyles.confirmBtn} onClick={onConfirm}>
            Yes, Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
    backdropFilter: "blur(3px)",
  },
  modal: {
    background: "#fff",
    borderRadius: "16px",
    padding: "28px 24px",
    maxWidth: "360px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
  },
  iconWrap: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    backgroundColor: "#fffbeb",
    border: "2px solid #fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#1e293b",
    margin: "0 0 12px",
  },
  message: {
    fontSize: "14px",
    color: "#64748b",
    lineHeight: "1.6",
    margin: "0 0 12px",
  },
  warning: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#92400e",
    backgroundColor: "#fffbeb",
    border: "1px solid #fef3c7",
    borderRadius: "8px",
    padding: "8px 12px",
    margin: "0 0 20px",
  },
  footer: {
    display: "flex",
    gap: "10px",
  },
  cancelBtn: {
    flex: 1.4,
    padding: "11px 12px",
    borderRadius: "10px",
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    fontWeight: "700",
    fontSize: "13px",
    color: "#334155",
    cursor: "pointer",
  },
  confirmBtn: {
    flex: 1,
    padding: "11px 12px",
    borderRadius: "10px",
    border: "none",
    background: "#ef4444",
    color: "#fff",
    fontWeight: "700",
    fontSize: "13px",
    cursor: "pointer",
  },
};

// ── Navbar ────────────────────────────────────────────────────────────────────
const Navbar = ({ onLogout, userEmail, userRole }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoutClick = () => {
    if (userRole === "student") {
      // Students get a confirmation warning
      setShowConfirm(true);
    } else {
      // Admins log out immediately — no confirmation needed
      onLogout();
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    onLogout();
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <nav className="bg-white px-[5%] py-2.5 flex justify-between items-center shadow-md sticky top-0 z-[1000]">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-2.5">
          <img src={udsLogo} alt="UDS" className="w-9" />
          <span className="font-bold text-[#198104] text-lg">
            TTFPP Attendance Portal
          </span>
        </div>

        {/* Right: Email + Logout */}
        <div className="flex items-center gap-5">
          {userEmail && (
            <span className="text-[13px] text-gray-500 hidden sm:block">
              {userEmail}
            </span>
          )}
          <button
            onClick={handleLogoutClick}
            className="bg-red-50 hover:bg-red-600 border border-red-300 text-red-600 hover:text-white px-4 py-1.5 rounded-md text-[13px] font-semibold cursor-pointer transition-all duration-300"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Student-only logout confirmation */}
      <LogoutConfirmModal
        isOpen={showConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

export default Navbar;
