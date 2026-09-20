import { useState } from "react";
import "./Login.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState("LOGIN"); // "LOGIN" | "REGISTER"
  const [role, setRole] = useState("STUDENT");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Student registration state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regBranch, setRegBranch] = useState("CSE");
  const [regSection, setRegSection] = useState("CSE-A");

  // Parent registration state
  const [regParentName, setRegParentName] = useState("");
  const [regParentEmail, setRegParentEmail] = useState("");
  const [regParentPassword, setRegParentPassword] = useState("");
  const [regParentConfirmPassword, setRegParentConfirmPassword] = useState("");
  const [regStudentRef, setRegStudentRef] = useState("");

  // Mentor registration state
  const [regMentorName, setRegMentorName] = useState("");
  const [regMentorEmail, setRegMentorEmail] = useState("");
  const [regMentorPassword, setRegMentorPassword] = useState("");
  const [regMentorConfirmPassword, setRegMentorConfirmPassword] = useState("");
  const [regMentorBranch, setRegMentorBranch] = useState("CSE");
  const [regMentorSection, setRegMentorSection] = useState("CSE-A");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setMessage("");
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setMessage("");
  };

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setMessage("");

    if (!email.trim() || !password) {
      setMessage("Please enter email and password ❌");
      return;
    }

    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const isParent = role === "PARENT";
      const endpoint = isParent ? `${API}/parent/login` : `${API}/auth/login`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

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
          throw new Error(`API endpoint not found (HTTP 404). Please verify backend URL: ${API}`);
        }
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new Error(`Backend server is waking up (HTTP ${response.status}). Please retry in a few seconds.`);
        }
        if (response.status === 401) {
          throw new Error(isParent ? "Invalid parent email or password" : "Invalid email or password");
        }
        throw new Error(`Login failed (HTTP ${response.status})`);
      }

      if (!data || !data.user) {
        throw new Error("Invalid response from server: user profile data missing.");
      }

      const returnedRole = String(data.user.role || "").toUpperCase();
      if (role !== returnedRole) {
        throw new Error(`This account is registered as ${returnedRole}. Please select the ${returnedRole} role.`);
      }

      const tokenVal = data.token || (returnedRole === "PARENT" ? "parent-token" : "user-token");
      localStorage.setItem("token", tokenVal);
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage(`Welcome ${data.user.name}! 🎉`);

      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(data.user, tokenVal);
      }
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      setMessage(`${error.message || "Login failed"} ❌`);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setMessage("");

    if (!regName.trim() || !regEmail.trim() || !regPassword || !regConfirmPassword || !regBranch || !regSection) {
      setMessage("Please fill all fields ❌");
      return;
    }

    if (regPassword.length < 6) {
      setMessage("Password must be at least 6 characters ❌");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setMessage("Passwords do not match ❌");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          role: "STUDENT",
          branch: regBranch.trim().toUpperCase(),
          section: regSection.trim().toUpperCase(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Registration failed (HTTP ${response.status})`);
      }

      const tokenVal = data.token || "user-token";
      localStorage.setItem("token", tokenVal);
      localStorage.setItem("user", JSON.stringify(data.user));
      setMessage(`Student account created! Welcome ${data.user.name}! 🎉`);

      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(data.user, tokenVal);
      }
    } catch (error) {
      console.error("REGISTRATION ERROR:", error);
      setMessage(`${error.message || "Registration failed"} ❌`);
    } finally {
      setLoading(false);
    }
  };

  const handleParentRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setMessage("");

    if (!regParentName.trim() || !regParentEmail.trim() || !regParentPassword || !regParentConfirmPassword || !regStudentRef.trim()) {
      setMessage("Please fill all fields ❌");
      return;
    }

    if (regParentPassword.length < 6) {
      setMessage("Password must be at least 6 characters ❌");
      return;
    }

    if (regParentPassword !== regParentConfirmPassword) {
      setMessage("Passwords do not match ❌");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API}/parent/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regParentName.trim(),
          email: regParentEmail.trim().toLowerCase(),
          password: regParentPassword,
          studentEmail: regStudentRef.trim().toLowerCase(),
          studentId: regStudentRef.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Registration failed (HTTP ${response.status})`);
      }

      const tokenVal = data.token || "parent-token";
      localStorage.setItem("token", tokenVal);
      localStorage.setItem("user", JSON.stringify(data.user));
      setMessage(`Parent account created! Welcome ${data.user.name}! 🎉`);

      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(data.user, tokenVal);
      }
    } catch (error) {
      console.error("PARENT REGISTRATION ERROR:", error);
      setMessage(`${error.message || "Registration failed"} ❌`);
    } finally {
      setLoading(false);
    }
  };

  const handleMentorRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setMessage("");

    if (!regMentorName.trim() || !regMentorEmail.trim() || !regMentorPassword || !regMentorConfirmPassword || !regMentorBranch || !regMentorSection) {
      setMessage("Please fill all mentor registration fields ❌");
      return;
    }

    if (regMentorPassword.length < 6) {
      setMessage("Password must be at least 6 characters ❌");
      return;
    }

    if (regMentorPassword !== regMentorConfirmPassword) {
      setMessage("Passwords do not match ❌");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regMentorName.trim(),
          email: regMentorEmail.trim().toLowerCase(),
          password: regMentorPassword,
          role: "MENTOR",
          branch: regMentorBranch.trim().toUpperCase(),
          section: regMentorSection.trim().toUpperCase(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Registration failed (HTTP ${response.status})`);
      }

      const tokenVal = data.token || "mentor-token";
      localStorage.setItem("token", tokenVal);
      localStorage.setItem("user", JSON.stringify(data.user));
      setMessage(`Mentor account created! Welcome ${data.user.name}! 🎉`);

      if (typeof onLoginSuccess === "function") {
        onLoginSuccess(data.user, tokenVal);
      }
    } catch (error) {
      console.error("MENTOR REGISTRATION ERROR:", error);
      setMessage(`${error.message || "Registration failed"} ❌`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>EduBridge</h1>
        <p>Student • Mentor • Parent • Admin Portal</p>
        <h2>{role} {mode === "LOGIN" ? "Login" : "Registration"}</h2>

        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => handleModeChange("LOGIN")}
            style={{ padding: "6px 12px", borderRadius: "6px", cursor: "pointer", background: mode === "LOGIN" ? "#4f46e5" : "#e2e8f0", color: mode === "LOGIN" ? "#ffffff" : "#334155", border: "none", fontWeight: "700" }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("REGISTER")}
            style={{ padding: "6px 12px", borderRadius: "6px", cursor: "pointer", background: mode === "REGISTER" ? "#4f46e5" : "#e2e8f0", color: mode === "REGISTER" ? "#ffffff" : "#334155", border: "none", fontWeight: "700" }}
          >
            Create Account
          </button>
        </div>

        {message && (
          <div
            style={{
              padding: "8px 12px",
              marginBottom: "12px",
              borderRadius: "6px",
              fontSize: "14px",
              background: message.includes("🎉") ? "#ecfdf5" : "#fef2f2",
              color: message.includes("🎉") ? "#065f46" : "#991b1b",
            }}
          >
            {message}
          </div>
        )}

        {/* Mode: LOGIN */}
        {mode === "LOGIN" && (
          <form onSubmit={handleLoginSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
            >
              <option value="STUDENT">Student</option>
              <option value="MENTOR">Mentor</option>
              <option value="PARENT">Parent</option>
              <option value="ADMIN">Admin</option>
            </select>

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        )}

        {/* Mode: REGISTER - STUDENT */}
        {mode === "REGISTER" && role === "STUDENT" && (
          <form onSubmit={handleStudentRegisterSubmit}>
            <input
              type="text"
              placeholder="Full Name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Branch (e.g. CSE)"
              value={regBranch}
              onChange={(e) => setRegBranch(e.target.value)}
            />
            <input
              type="text"
              placeholder="Section (e.g. CSE-A)"
              value={regSection}
              onChange={(e) => setRegSection(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Register Student"}
            </button>
          </form>
        )}

        {/* Mode: REGISTER - PARENT */}
        {mode === "REGISTER" && role === "PARENT" && (
          <form onSubmit={handleParentRegisterSubmit}>
            <input
              type="text"
              placeholder="Parent Full Name"
              value={regParentName}
              onChange={(e) => setRegParentName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Parent Email"
              value={regParentEmail}
              onChange={(e) => setRegParentEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Student's Registered Email"
              value={regStudentRef}
              onChange={(e) => setRegStudentRef(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={regParentPassword}
              onChange={(e) => setRegParentPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={regParentConfirmPassword}
              onChange={(e) => setRegParentConfirmPassword(e.target.value)}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Register Parent"}
            </button>
          </form>
        )}

        {/* Mode: REGISTER - MENTOR */}
        {mode === "REGISTER" && role === "MENTOR" && (
          <form onSubmit={handleMentorRegisterSubmit}>
            <input
              type="text"
              placeholder="Faculty / Mentor Full Name"
              value={regMentorName}
              onChange={(e) => setRegMentorName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Official Email Address"
              value={regMentorEmail}
              onChange={(e) => setRegMentorEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Department / Branch (e.g. CSE)"
              value={regMentorBranch}
              onChange={(e) => setRegMentorBranch(e.target.value)}
            />
            <input
              type="text"
              placeholder="Section (e.g. CSE-A)"
              value={regMentorSection}
              onChange={(e) => setRegMentorSection(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={regMentorPassword}
              onChange={(e) => setRegMentorPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={regMentorConfirmPassword}
              onChange={(e) => setRegMentorConfirmPassword(e.target.value)}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Register Mentor"}
            </button>
          </form>
        )}

        {/* Mode: REGISTER - ADMIN RESTRICTED */}
        {mode === "REGISTER" && role === "ADMIN" && (
          <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 12px" }}>
              Admin accounts are created securely by the system administrator.
            </p>
            <button
              type="button"
              onClick={() => handleModeChange("LOGIN")}
              style={{ padding: "8px 16px", background: "#4f46e5", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "700" }}
            >
              Switch to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;