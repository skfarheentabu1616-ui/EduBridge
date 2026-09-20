import "./Login.css";

function Login() {
  return (
    <div className="login-page">
      <div className="login-box">
        <h1>EduBridge</h1>

        <p>Student • Mentor • Parent Portal</p>

        <h2>Login</h2>

        <input
          type="email"
          placeholder="Email"
        />

        <input
          type="password"
          placeholder="Password"
        />

        <select>
          <option value="student">Student</option>
          <option value="mentor">Mentor</option>
          <option value="parent">Parent</option>
          <option value="admin">Admin</option>
        </select>

        <button>Login</button>
      </div>
    </div>
  );
}

export default Login;