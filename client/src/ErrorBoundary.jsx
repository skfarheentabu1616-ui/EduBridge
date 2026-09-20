import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("REACT APP CRASHED:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
            color: "white",
            fontFamily: "Inter, -apple-system, sans-serif",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(16px)",
              padding: "40px",
              borderRadius: "20px",
              maxWidth: "500px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ fontSize: "50px", marginBottom: "12px" }}>⚠️</div>
            <h2 style={{ fontSize: "22px", marginBottom: "8px" }}>
              Something went wrong
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px" }}>
              {this.state.error?.message || "An unexpected rendering error occurred."}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: "12px 24px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                color: "white",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(79, 70, 229, 0.4)",
              }}
            >
              🔄 Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
