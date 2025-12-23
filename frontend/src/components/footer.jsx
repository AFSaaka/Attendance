import React from "react";

const Footer = () => {
  const footerStyle = {
    textAlign: "center",
    padding: "25px",
    color: "#888",
    fontSize: "13px",
    borderTop: "1px solid #eee",
    backgroundColor: "#fff",
    marginTop: "auto", // Pushes footer to bottom in flex containers
  };

  return (
    <footer style={footerStyle}>
      <p style={{ margin: 0 }}>
        &copy; {new Date().getFullYear()} University for Development Studies
      </p>
      <p style={{ margin: "5px 0 0 0", fontSize: "11px" }}>
        Third Trimester Field Practical Programme (TTFPP) Management System
      </p>
    </footer>
  );
};

export default Footer;
