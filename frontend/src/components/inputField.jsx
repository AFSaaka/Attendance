import React from "react";

const InputField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  isFocused,
  onFocus,
  onBlur,
}) => {
  const style = {
    width: "100%",
    padding: "12px",
    margin: "5px 0",
    borderRadius: "8px",
    border: isFocused ? "1px solid #2ae605ff" : "1px solid #ddd",
    outline: "none",
    fontSize: "15px",
    boxSizing: "border-box",
    transition: "border 0.2s",
  };

  return (
    <div style={{ textAlign: "left", marginBottom: "10px" }}>
      {label && (
        <label style={{ fontSize: "13px", color: "#666", marginLeft: "5px" }}>
          {label}
        </label>
      )}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={style}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  );
};

export default InputField;
