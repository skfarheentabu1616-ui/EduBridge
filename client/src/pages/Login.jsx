import { useState } from "react";
import "./Login.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function Login({ onLoginSuccess }) {
  const [role, setRole] = useState("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setMessage("");
  };

  const handleSubmit = async (e) => {
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
            `Backend server is waking up (HTTP ${response.status}). Please retry in a few seconds.`
          );
        }
        if (response.status === 401) {
          throw new Error(
            isParent
              ? "Invalid parent email or password"
              : "Invalid email or password"
          );
        }
        throw new Error(`Login failed (HTTP ${response.status})`);
      }

      if (!data || !data.user) {
        throw new Error(
          "Invalid response from server: user profile data missing."
        );
      }

      const returnedRole = String(data.user.role || "").toUpperCase();
      if (role !== returnedRole) {
        throw new Error(
          `This account is registered as ${returnedRole}. Please select the ${returnedRole} role.`
        );
      }

      const tokenVal =
        data.token || (returnedRole === "PARENT" ? "parent-token" : "user-token");
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

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>EduBridge</h1>
        <p>Student • Mentor • Parent • Admin Portal</p>
        <h2>{role} Login</h2>

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

        <form onSubmit={handleSubmit}>
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
      </div>
    </div>
  );
}

export default Login;