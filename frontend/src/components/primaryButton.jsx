import React, { useState } from "react";
import { Loader2 } from "lucide-react";

const PrimaryButton = ({ children, onClick, disabled, isLoading }) => {
  const [isHovered, setIsHovered] = useState(false);

  const style = {
    width: "100%",
    padding: "12px",
    backgroundColor: disabled ? "#cccccc" : isHovered ? "#22a306" : "#198104",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: disabled || isLoading ? "not-allowed" : "pointer",
    marginTop: "12px",
    transition: "all 0.3s ease",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    boxShadow:
      !disabled && isHovered ? "0 0 15px rgba(25, 129, 4, 0.4)" : "none",
    transform: !disabled && isHovered ? "translateY(-1px)" : "none",
  };

  return (
    <button
      style={style}
      onClick={onClick}
      disabled={disabled || isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isLoading ? (
        <>
          <Loader2 className="spinner" size={20} />
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default PrimaryButton;
