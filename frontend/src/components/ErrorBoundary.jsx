import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", textAlign: "center", color: "#991b1b" }}>
          <h2>Something went wrong.</h2>
          <p>Please try refreshing the page or contact the Administrators.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "10px 20px", cursor: "pointer" }}
          >
            Refresh Portal
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
