
import { useState } from "react";

import StudentDashboard from "./StudentDashboard";
import MentorDashboard from "./MentorDashboard";
import ParentDashboard from "./ParentDashboard";
import AdminDashboard from "./AdminDashboard";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ROLES = [
  {
    id: "STUDENT",
    title: "Student",
    icon: "🎓",
    desc: "View your academic progress",
    loginTitle: "Student Login",
    loginSubtitle: "Sign in to view your attendance, marks, fees & timetable",
    emailPlaceholder: "student@college.edu (e.g. rahul@student.com)",
    demoEmail: "rahul@student.com",
    demoPass: "password123",
    color: "#4f46e5",
    bgLight: "#eef2ff",
    borderColor: "#c7d2fe",
  },
  {
    id: "PARENT",
    title: "Parent",
    icon: "👪",
    desc: "Monitor your child's progress",
    loginTitle: "Parent Login",
    loginSubtitle: "Sign in to track your ward's attendance, marks & fee status",
    emailPlaceholder: "parent@example.com (e.g. parent@test.com)",
    demoEmail: "parent@test.com",
    demoPass: "password123",
    color: "#db2777",
    bgLight: "#fdf2f8",
    borderColor: "#fbcfe8",
  },
  {
    id: "MENTOR",
    title: "Mentor",
    icon: "👨‍🏫",
    desc: "Manage students & academics",
    loginTitle: "Mentor Login",
    loginSubtitle: "Sign in to manage classes, attendance, marks & observations",
    emailPlaceholder: "mentor@college.edu (e.g. kumar@mentor.com)",
    demoEmail: "kumar@mentor.com",
    demoPass: "password123",
    color: "#059669",
    bgLight: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  {
    id: "ADMIN",
    title: "Admin",
    icon: "🛡️",
    desc: "Manage the entire portal",
    loginTitle: "Admin Login",
    loginSubtitle: "Sign in for system administration & user management",
    emailPlaceholder: "admin@edubridge.com",
    demoEmail: "admin@edubridge.com",
    demoPass: "admin123",
    color: "#d97706",
    bgLight: "#fffbeb",
    borderColor: "#fde68a",
  },
];

const FEATURES = [
  { label: "Attendance", icon: "📅" },
  { label: "Marks", icon: "📚" },
  { label: "Fees", icon: "💰" },
  { label: "Leaves", icon: "📝" },
  { label: "Issues", icon: "🏫" },
  { label: "Timetable", icon: "🗓️" },
  { label: "Observations", icon: "👀" },
];

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [selectedRole, setSelectedRole] = useState("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const activeRoleData = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  const handleLogout = () => {
    localStorage.clear();
    setToken("");
    setUser(null);
  };

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setMessage("");
  };

  const handleFillDemo = () => {
    setEmail(activeRoleData.demoEmail);
    setPassword(activeRoleData.demoPass);
    setMessage("");
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please enter email and password ❌");
      return;
    }

    try {
      setLoading(true);

      const cleanEmail = email.trim().toLowerCase();
      const isParent = selectedRole === "PARENT" || cleanEmail.includes("parent");

      const endpoints = isParent
        ? [`${API}/parent/login`, `${API}/auth/login`]
        : [`${API}/auth/login`, `${API}/parent/login`];

      let lastErrorMessage = "Invalid email or password ❌";

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, password }),
          });

          const data = await response.json().catch(() => ({}));

          if (response.ok && data.user) {
            const tokenVal = data.token || (isParent ? "parent-token" : "user-token");
            localStorage.setItem("token", tokenVal);
            localStorage.setItem("user", JSON.stringify(data.user));
            setToken(tokenVal);
            setUser(data.user);
            setMessage(`Welcome ${data.user.name}! 🎉`);
            return;
          }

          if (data.message) {
            lastErrorMessage = data.message;
          }
        } catch {
          // try next endpoint fallback
        }
      }

      setMessage(lastErrorMessage || "Invalid email or password ❌");
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      setMessage("Server connection failed. Please check if the backend is running. ❌");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ROLE-BASED ROUTING TO DASHBOARDS
  // ==========================================

  const currentRole = String(user?.role || "").toUpperCase();

  if (token && user) {
    if (currentRole === "ADMIN") {
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    }

    if (currentRole === "MENTOR") {
      return <MentorDashboard user={user} onLogout={handleLogout} />;
    }

    if (currentRole === "STUDENT") {
      return <StudentDashboard user={user} onLogout={handleLogout} />;
    }

    if (currentRole === "PARENT") {
      return <ParentDashboard user={user} onLogout={handleLogout} />;
    }
  }

  // ==========================================
  // PROFESSIONAL COLLEGE EXPO LOGIN UI
  // ==========================================

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #090d16 0%, #111827 40%, #1e1b4b 100%)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "32px 16px",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Background Ambient Glows */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "10%",
          width: "450px",
          height: "450px",
          background: "radial-gradient(circle, rgba(79, 70, 229, 0.18) 0%, rgba(79, 70, 229, 0) 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          right: "10%",
          width: "480px",
          height: "480px",
          background: "radial-gradient(circle, rgba(219, 39, 119, 0.14) 0%, rgba(219, 39, 119, 0) 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      {/* Main Container */}
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* =====================================================
            HEADER SECTION
           ===================================================== */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              fontSize: "32px",
              boxShadow: "0 12px 30px rgba(79, 70, 229, 0.45)",
              marginBottom: "14px",
            }}
          >
            🎓
          </div>
          <h1
            style={{
              fontSize: "30px",
              fontWeight: "900",
              color: "#ffffff",
              margin: "0 0 6px",
              letterSpacing: "-0.5px",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
            }}
          >
            Welcome to EduBridge 🚀
          </h1>
          <p
            style={{
              color: "#94a3b8",
              fontSize: "15px",
              fontWeight: "500",
              margin: 0,
            }}
          >
            College Academic Management Portal
          </p>
        </div>

        {/* =====================================================
            ROLE SELECTION SECTION
           ===================================================== */}
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "#cbd5e1",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>👤</span> Select Your Role
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
              gap: "10px",
            }}
          >
            {ROLES.map((role) => {
              const isActive = selectedRole === role.id;

              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
                  style={{
                    padding: "16px 14px",
                    borderRadius: "16px",
                    border: isActive
                      ? `2px solid ${role.color}`
                      : "1.5px solid rgba(255, 255, 255, 0.12)",
                    background: isActive
                      ? "rgba(255, 255, 255, 0.98)"
                      : "rgba(30, 41, 59, 0.75)",
                    backdropFilter: "blur(12px)",
                    boxShadow: isActive
                      ? `0 12px 28px rgba(0, 0, 0, 0.25), 0 0 0 3px ${role.color}25`
                      : "0 4px 12px rgba(0, 0, 0, 0.15)",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isActive ? "translateY(-2px)" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>{role.icon}</span>
                    {isActive && (
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: role.color,
                          boxShadow: `0 0 8px ${role.color}`,
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "15px",
                        fontWeight: "800",
                        color: isActive ? "#0f172a" : "#f8fafc",
                        marginBottom: "2px",
                      }}
                    >
                      {role.title}
                    </strong>
                    <span
                      style={{
                        display: "block",
                        fontSize: "11px",
                        fontWeight: "500",
                        color: isActive ? "#475569" : "#94a3b8",
                        lineHeight: "1.35",
                      }}
                    >
                      {role.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            LOGIN FORM CARD
           ===================================================== */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            padding: "32px 28px",
            boxShadow:
              "0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)",
            position: "relative",
          }}
        >
          {/* Form Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "22px",
              paddingBottom: "16px",
              borderBottom: "1px solid #f1f5f9",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <span style={{ fontSize: "20px" }}>{activeRoleData.icon}</span>
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: "800",
                    color: "#0f172a",
                    margin: 0,
                    letterSpacing: "-0.3px",
                  }}
                >
                  {activeRoleData.loginTitle}
                </h2>
              </div>
              <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                {activeRoleData.loginSubtitle}
              </p>
            </div>

            {/* Quick Demo Fill Button for Expo */}
            <button
              type="button"
              onClick={handleFillDemo}
              title={`Auto-fill ${activeRoleData.title} demo account`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "10px",
                border: `1px solid ${activeRoleData.borderColor}`,
                background: activeRoleData.bgLight,
                color: activeRoleData.color,
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>⚡</span> Demo Credentials
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: "18px" }}
          >
            {/* Email Field */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                placeholder={activeRoleData.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "13px 15px",
                  borderRadius: "12px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  color: "#0f172a",
                  background: "#ffffff",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
              />
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "13px 45px 13px 15px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    color: "#0f172a",
                    background: "#ffffff",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "4px",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Feedback / Status Alert */}
            {message && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: "600",
                  background: message.includes("🎉") ? "#dcfce7" : "#fee2e2",
                  color: message.includes("🎉") ? "#15803d" : "#b91c1c",
                  border: `1px solid ${
                    message.includes("🎉") ? "#86efac" : "#fca5a5"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>{message.includes("🎉") ? "✅" : "⚠️"}</span>
                <span>{message}</span>
              </div>
            )}

            {/* Submit Button with Loading State */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "4px",
                padding: "15px",
                borderRadius: "14px",
                border: "none",
                background: loading
                  ? "#94a3b8"
                  : `linear-gradient(135deg, ${activeRoleData.color} 0%, #7c3aed 100%)`,
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: "800",
                letterSpacing: "0.2px",
                cursor: loading ? "wait" : "pointer",
                boxShadow: loading
                  ? "none"
                  : `0 10px 25px ${activeRoleData.color}50`,
                transition: "all 0.15s ease",
              }}
            >
              {loading ? "Signing in... ⏳" : "Sign In to EduBridge 🚀"}
            </button>
          </form>
        </div>

        {/* =====================================================
            FOOTER / EXPO VALUE PROPOSITION
           ===================================================== */}
        <div style={{ textAlign: "center", padding: "10px 0 0" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#e2e8f0",
              marginBottom: "10px",
              letterSpacing: "0.3px",
            }}
          >
            One platform for complete academic management
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {FEATURES.map((item) => (
              <span
                key={item.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 11px",
                  borderRadius: "20px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#cbd5e1",
                  fontSize: "12px",
                  fontWeight: "600",
                  backdropFilter: "blur(6px)",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

