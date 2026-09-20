
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

  const [authMode, setAuthMode] = useState("LOGIN"); // "LOGIN" | "REGISTER"
  const [selectedRole, setSelectedRole] = useState("STUDENT");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Student registration state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regBranch, setRegBranch] = useState("CSE");
  const [regSection, setRegSection] = useState("CSE-A");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Parent registration state
  const [regParentName, setRegParentName] = useState("");
  const [regParentEmail, setRegParentEmail] = useState("");
  const [regParentPassword, setRegParentPassword] = useState("");
  const [regParentConfirmPassword, setRegParentConfirmPassword] = useState("");
  const [regStudentRef, setRegStudentRef] = useState("");
  const [showRegParentPassword, setShowRegParentPassword] = useState(false);
  const [showRegParentConfirmPassword, setShowRegParentConfirmPassword] = useState(false);

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

  const handleModeChange = (mode) => {
    setAuthMode(mode);
    setMessage("");
  };

  const handleFillDemo = () => {
    setAuthMode("LOGIN");
    setEmail(activeRoleData.demoEmail);
    setPassword(activeRoleData.demoPass);
    setMessage("");
  };

  // ==========================================
  // SIGN IN HANDLER
  // ==========================================

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

      // Role selection strictly controls the auth endpoint
      const isParent = selectedRole === "PARENT";
      const endpoint = isParent ? `${API}/parent/login` : `${API}/auth/login`;

      let response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
      } catch (networkErr) {
        console.error("NETWORK ERROR:", networkErr);
        throw new Error(
          "Unable to connect to the backend server. Please verify your connection or backend URL."
        );
      }

      const resText = await response.text();
      let data = {};
      try {
        data = JSON.parse(resText);
      } catch {
        // Non-JSON response
      }

      if (!response.ok) {
        if (data && data.message) {
          throw new Error(data.message);
        }
        if (response.status === 404) {
          throw new Error(
            `API endpoint not found (HTTP 404). Please verify backend URL: ${API}`
          );
        }
        if (
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504
        ) {
          throw new Error(
            `Backend server is waking up or temporarily unavailable (HTTP ${response.status}). Please wait a few seconds and try again.`
          );
        }
        if (response.status === 401) {
          throw new Error(
            isParent
              ? "Invalid parent email or password"
              : "Invalid email or password"
          );
        }
        throw new Error(
          `Login failed with HTTP status ${response.status}. Please check your credentials.`
        );
      }

      if (!data || !data.user) {
        throw new Error(
          "Invalid response from server: user profile data missing."
        );
      }

      const returnedRole = String(data.user.role || "").toUpperCase();

      // Verify that the authenticated account matches the selected login role
      if (selectedRole !== returnedRole) {
        throw new Error(
          `This account is registered as ${returnedRole}, but you are logging in on the ${activeRoleData.title} tab. Please switch to the ${returnedRole} tab to sign in.`
        );
      }

      const tokenVal =
        data.token || (returnedRole === "PARENT" ? "parent-token" : "user-token");

      localStorage.setItem("token", tokenVal);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(tokenVal);
      setUser(data.user);
      setMessage(`Welcome ${data.user.name}! 🎉`);
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      setMessage(`${error.message || "Login failed. Please try again."} ❌`);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STUDENT REGISTRATION HANDLER
  // ==========================================

  const handleStudentRegister = async (e) => {
    if (e) e.preventDefault();
    setMessage("");

    if (
      !regName.trim() ||
      !regEmail.trim() ||
      !regPassword ||
      !regConfirmPassword ||
      !regBranch ||
      !regSection
    ) {
      setMessage("Please fill in all student registration fields ❌");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regEmail.trim())) {
      setMessage("Please enter a valid email address ❌");
      return;
    }

    if (regPassword.length < 6) {
      setMessage("Password must be at least 6 characters long ❌");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setMessage("Passwords do not match. Please verify and try again ❌");
      return;
    }

    try {
      setLoading(true);

      const cleanEmail = regEmail.trim().toLowerCase();

      let response;
      try {
        response = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: regName.trim(),
            email: cleanEmail,
            password: regPassword,
            role: "STUDENT",
            branch: regBranch.trim().toUpperCase(),
            section: regSection.trim().toUpperCase(),
          }),
        });
      } catch (networkErr) {
        console.error("NETWORK ERROR:", networkErr);
        throw new Error(
          "Unable to reach the backend server. Please verify your connection."
        );
      }

      const resText = await response.text();
      let data = {};
      try {
        data = JSON.parse(resText);
      } catch {
        // Non-JSON response
      }

      if (!response.ok) {
        throw new Error(
          data.message || `Registration failed with status code ${response.status}`
        );
      }

      if (!data || !data.user) {
        throw new Error("Registration succeeded but profile data was missing.");
      }

      const tokenVal = data.token || "user-token";
      localStorage.setItem("token", tokenVal);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(tokenVal);
      setUser(data.user);
      setMessage(`Student account created successfully! Welcome ${data.user.name}! 🎉`);
    } catch (error) {
      console.error("STUDENT REGISTRATION ERROR:", error);
      setMessage(`${error.message || "Registration failed. Please try again."} ❌`);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // PARENT REGISTRATION HANDLER
  // ==========================================

  const handleParentRegister = async (e) => {
    if (e) e.preventDefault();
    setMessage("");

    if (
      !regParentName.trim() ||
      !regParentEmail.trim() ||
      !regParentPassword ||
      !regParentConfirmPassword ||
      !regStudentRef.trim()
    ) {
      setMessage("Please fill in all parent registration fields ❌");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regParentEmail.trim())) {
      setMessage("Please enter a valid parent email address ❌");
      return;
    }

    if (regParentPassword.length < 6) {
      setMessage("Password must be at least 6 characters long ❌");
      return;
    }

    if (regParentPassword !== regParentConfirmPassword) {
      setMessage("Passwords do not match. Please verify and try again ❌");
      return;
    }

    try {
      setLoading(true);

      const cleanEmail = regParentEmail.trim().toLowerCase();
      const cleanStudentRef = regStudentRef.trim();

      let response;
      try {
        response = await fetch(`${API}/parent/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: regParentName.trim(),
            email: cleanEmail,
            password: regParentPassword,
            studentEmail: cleanStudentRef,
            studentId: cleanStudentRef,
          }),
        });
      } catch (networkErr) {
        console.error("NETWORK ERROR:", networkErr);
        throw new Error(
          "Unable to reach the backend server. Please verify your connection."
        );
      }

      const resText = await response.text();
      let data = {};
      try {
        data = JSON.parse(resText);
      } catch {
        // Non-JSON response
      }

      if (!response.ok) {
        throw new Error(
          data.message || `Registration failed with status code ${response.status}`
        );
      }

      if (!data || !data.user) {
        throw new Error("Registration succeeded but parent profile data was missing.");
      }

      const tokenVal = data.token || "parent-token";
      localStorage.setItem("token", tokenVal);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(tokenVal);
      setUser(data.user);
      setMessage(`Parent account created successfully! Welcome ${data.user.name}! 🎉`);
    } catch (error) {
      console.error("PARENT REGISTRATION ERROR:", error);
      setMessage(`${error.message || "Registration failed. Please try again."} ❌`);
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
  // PROFESSIONAL COLLEGE EXPO AUTH UI
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
            AUTH CARD (SIGN IN / REGISTER)
           ===================================================== */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            padding: "30px 26px",
            boxShadow:
              "0 25px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)",
            position: "relative",
          }}
        >
          {/* Card Header with Sign In / Register Nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
              paddingBottom: "16px",
              borderBottom: "1px solid #f1f5f9",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Title & Subtitle */}
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
                  {authMode === "LOGIN"
                    ? activeRoleData.loginTitle
                    : selectedRole === "STUDENT"
                    ? "Student Registration"
                    : selectedRole === "PARENT"
                    ? "Parent Registration"
                    : `${activeRoleData.title} Access`}
                </h2>
              </div>
              <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                {authMode === "LOGIN"
                  ? activeRoleData.loginSubtitle
                  : selectedRole === "STUDENT"
                  ? "Create your student profile with branch and section details"
                  : selectedRole === "PARENT"
                  ? "Register with your details and your student's email"
                  : "Administrative account management"}
              </p>
            </div>

            {/* Mode Switcher Pills (Sign In / Create Account) */}
            <div
              style={{
                display: "inline-flex",
                background: "#f1f5f9",
                padding: "3px",
                borderRadius: "12px",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => handleModeChange("LOGIN")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: authMode === "LOGIN" ? "#ffffff" : "transparent",
                  color: authMode === "LOGIN" ? "#0f172a" : "#64748b",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow:
                    authMode === "LOGIN" ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                🔑 Sign In
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("REGISTER")}
                style={{
                  padding: "7px 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: authMode === "REGISTER" ? "#ffffff" : "transparent",
                  color: authMode === "REGISTER" ? activeRoleData.color : "#64748b",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow:
                    authMode === "REGISTER"
                      ? "0 2px 6px rgba(0,0,0,0.08)"
                      : "none",
                  transition: "all 0.15s ease",
                }}
              >
                ✨ Create Account
              </button>
            </div>
          </div>

          {/* =====================================================
              CASE 1: SIGN IN MODE (All Roles)
             ===================================================== */}
          {authMode === "LOGIN" && (
            <form
              onSubmit={handleLogin}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Quick Demo Fill Button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
                    padding: "12px 14px",
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
                      padding: "12px 45px 12px 14px",
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "4px",
                  padding: "14px",
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
                {loading ? "Signing in... ⏳" : `Sign In as ${activeRoleData.title} 🚀`}
              </button>

              {/* Helper link to switch to Register */}
              {(selectedRole === "STUDENT" || selectedRole === "PARENT") && (
                <div style={{ textAlign: "center", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => handleModeChange("REGISTER")}
                    style={{
                      background: "none",
                      border: "none",
                      color: activeRoleData.color,
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Don't have an account? Create {activeRoleData.title} Account ✨
                  </button>
                </div>
              )}
            </form>
          )}

          {/* =====================================================
              CASE 2: STUDENT REGISTRATION FORM
             ===================================================== */}
          {authMode === "REGISTER" && selectedRole === "STUDENT" && (
            <form
              onSubmit={handleStudentRegister}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Full Name */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Farheen Tabu"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    borderRadius: "11px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    color: "#0f172a",
                    background: "#ffffff",
                  }}
                />
              </div>

              {/* Email Address */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. farheen@student.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    borderRadius: "11px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    color: "#0f172a",
                    background: "#ffffff",
                  }}
                />
              </div>

              {/* Branch & Section Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "5px",
                    }}
                  >
                    Branch / Dept
                  </label>
                  <select
                    value={regBranch}
                    onChange={(e) => {
                      const newBranch = e.target.value;
                      setRegBranch(newBranch);
                      setRegSection(`${newBranch}-A`);
                    }}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 13px",
                      borderRadius: "11px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0f172a",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <option value="CSE">CSE (Computer Science)</option>
                    <option value="AIML">AIML (AI & Machine Learning)</option>
                    <option value="ECE">ECE (Electronics & Comm)</option>
                    <option value="MECH">MECH (Mechanical)</option>
                    <option value="IT">IT (Information Tech)</option>
                    <option value="CIVIL">CIVIL (Civil Engineering)</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "5px",
                    }}
                  >
                    Section
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE-A"
                    value={regSection}
                    onChange={(e) => setRegSection(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 13px",
                      borderRadius: "11px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0f172a",
                      background: "#ffffff",
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Password (min 6 characters)
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    placeholder="Create password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 45px 11px 13px",
                      borderRadius: "11px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0f172a",
                      background: "#ffffff",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    title={showRegPassword ? "Hide password" : "Show password"}
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
                    }}
                  >
                    {showRegPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Confirm Password
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type={showRegConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 45px 11px 13px",
                      borderRadius: "11px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0f172a",
                      background: "#ffffff",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    title={showRegConfirmPassword ? "Hide password" : "Show password"}
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
                    }}
                  >
                    {showRegConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {message && (
                <div
                  style={{
                    padding: "11px 13px",
                    borderRadius: "11px",
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "6px",
                  padding: "14px",
                  borderRadius: "14px",
                  border: "none",
                  background: loading
                    ? "#94a3b8"
                    : `linear-gradient(135deg, ${activeRoleData.color} 0%, #7c3aed 100%)`,
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: "800",
                  cursor: loading ? "wait" : "pointer",
                  boxShadow: `0 10px 25px ${activeRoleData.color}50`,
                }}
              >
                {loading ? "Creating Account... ⏳" : "Create Student Account 🎓"}
              </button>

              {/* Switch to Sign In link */}
              <div style={{ textAlign: "center", marginTop: "2px" }}>
                <button
                  type="button"
                  onClick={() => handleModeChange("LOGIN")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4f46e5",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Already have an account? Sign In 🔑
                </button>
              </div>
            </form>
          )}

          {/* =====================================================
              CASE 3: PARENT REGISTRATION FORM
             ===================================================== */}
          {authMode === "REGISTER" && selectedRole === "PARENT" && (
            <form
              onSubmit={handleParentRegister}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Parent Full Name */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Parent / Guardian Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={regParentName}
                  onChange={(e) => setRegParentName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    borderRadius: "11px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    color: "#0f172a",
                    background: "#ffffff",
                  }}
                />
              </div>

              {/* Parent Email */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Parent Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. parent@example.com"
                  value={regParentEmail}
                  onChange={(e) => setRegParentEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    borderRadius: "11px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    color: "#0f172a",
                    background: "#ffffff",
                  }}
                />
              </div>

              {/* Linked Student Reference */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Student's Registered Email or Student ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. rahul@student.com"
                  value={regStudentRef}
                  onChange={(e) => setRegStudentRef(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    borderRadius: "11px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    color: "#0f172a",
                    background: "#ffffff",
                  }}
                />
                <small
                  style={{
                    display: "block",
                    color: "#64748b",
                    fontSize: "11px",
                    marginTop: "4px",
                  }}
                >
                  ℹ️ Enter the registered college email of your ward to link accounts securely.
                </small>
              </div>

              {/* Password */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Password (min 6 characters)
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type={showRegParentPassword ? "text" : "password"}
                    placeholder="Create password"
                    value={regParentPassword}
                    onChange={(e) => setRegParentPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 45px 11px 13px",
                      borderRadius: "11px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0f172a",
                      background: "#ffffff",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowRegParentPassword(!showRegParentPassword)
                    }
                    title={showRegParentPassword ? "Hide password" : "Show password"}
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
                    }}
                  >
                    {showRegParentPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#334155",
                    marginBottom: "5px",
                  }}
                >
                  Confirm Password
                </label>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type={showRegParentConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={regParentConfirmPassword}
                    onChange={(e) =>
                      setRegParentConfirmPassword(e.target.value)
                    }
                    required
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 45px 11px 13px",
                      borderRadius: "11px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                      color: "#0f172a",
                      background: "#ffffff",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowRegParentConfirmPassword(
                        !showRegParentConfirmPassword
                      )
                    }
                    title={
                      showRegParentConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
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
                    }}
                  >
                    {showRegParentConfirmPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {message && (
                <div
                  style={{
                    padding: "11px 13px",
                    borderRadius: "11px",
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "6px",
                  padding: "14px",
                  borderRadius: "14px",
                  border: "none",
                  background: loading
                    ? "#94a3b8"
                    : `linear-gradient(135deg, ${activeRoleData.color} 0%, #db2777 100%)`,
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: "800",
                  cursor: loading ? "wait" : "pointer",
                  boxShadow: `0 10px 25px ${activeRoleData.color}50`,
                }}
              >
                {loading ? "Creating Parent Account... ⏳" : "Create Parent Account 👪"}
              </button>

              {/* Switch to Sign In link */}
              <div style={{ textAlign: "center", marginTop: "2px" }}>
                <button
                  type="button"
                  onClick={() => handleModeChange("LOGIN")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#db2777",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Already have an account? Sign In 🔑
                </button>
              </div>
            </form>
          )}

          {/* =====================================================
              CASE 4: MENTOR OR ADMIN REGISTRATION RESTRICTION NOTICE
             ===================================================== */}
          {authMode === "REGISTER" &&
            (selectedRole === "MENTOR" || selectedRole === "ADMIN") && (
              <div
                style={{
                  padding: "24px 20px",
                  borderRadius: "16px",
                  background: activeRoleData.bgLight,
                  border: `1.5px solid ${activeRoleData.borderColor}`,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "54px",
                    height: "54px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "26px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  {activeRoleData.icon}
                </div>

                <div>
                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: "17px",
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    {selectedRole === "MENTOR"
                      ? "Mentor Registration Restricted"
                      : "Admin Registration Restricted"}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "#475569",
                      lineHeight: "1.5",
                      maxWidth: "460px",
                    }}
                  >
                    {selectedRole === "MENTOR"
                      ? "Mentor accounts are created by the administrator. Faculty mentors should contact their department administrator for authorized credentials."
                      : "Admin accounts are created securely by the system administrator. Public registration is disabled for administrative security."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleModeChange("LOGIN")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: activeRoleData.color,
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: `0 4px 12px ${activeRoleData.color}40`,
                    transition: "all 0.15s ease",
                  }}
                >
                  👉 Switch to {activeRoleData.title} Sign In
                </button>
              </div>
            )}
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

