import React from "react";
import udsLogo from "../assets/udslogo.ico";

const Navbar = ({ onLogout, userEmail }) => {
  const navStyle = {
    backgroundColor: "#fff",
    padding: "10px 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  };

  return (
    <nav style={navStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <img src={udsLogo} alt="UDS" style={{ width: "35px" }} />
        <span
          style={{ fontWeight: "700", color: "#198104", fontSize: "1.1rem" }}
        >
          TTFPP Portal
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {userEmail && (
          <span
            style={{
              fontSize: "13px",
              color: "#666",
              display: "none",
              sm: "block",
            }}
          >
            {userEmail}
          </span>
        )}
        <button
          onClick={onLogout}
          style={{
            background: "#fff1f0",
            border: "1px solid #ffa39e",
            color: "#cf1322",
            padding: "5px 15px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
