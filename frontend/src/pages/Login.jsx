import { useState } from "react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Mock authentication
    setTimeout(() => {
      if (username === "admin" && password === "password") {
        onLogin();
      } else {
        setError("Invalid username or password");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="login-container">
      <div className="app-bg-glow glow-one" />
      <div className="app-bg-glow glow-two" />

      <div className="login-card">
        <div className="login-header">
          <div className="brand-badge login-badge">💪</div>
          <h1 className="brand-title">Welcome Back</h1>
          <p className="brand-subtitle">Sign in to AI Gym Assistant</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter 'admin'"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter 'password'"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
        <div className="login-hint">
          <p>Demo Credentials</p>
          <span>admin / password</span>
        </div>
      </div>
    </div>
  );
}
