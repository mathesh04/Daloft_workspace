import { Link } from "react-router-dom";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DaloftBrand } from "./WorkspaceShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(employeeId.trim(), password);
      navigate(user.role === "SYSTEM_ADMIN" ? "/system" : (user.role === "ADMIN" || user.role === "HR_ADMIN") ? "/admin" : user.role === "MANAGER" ? "/manager" : "/employee");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="daloft-login">
      <div className="login-panel-inner">
        <div className="login-mobile-brand">
          <DaloftBrand />
        </div>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-heading">
            <span className="login-eyebrow">Secure access</span>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-sub">Sign in to your Daloft People workspace</p>
          </div>

          <div className="field">
            <label htmlFor="login-employee-id">Employee ID</label>
            <input
              id="login-employee-id"
              type="text"
              placeholder="e.g. EMP001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div className="field">
            <div className="login-field-label">
              <label htmlFor="login-password">Password</label>
            </div>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in to workspace →"}
          </button>

          <div className="login-help">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        </form>

        <div className="login-foot">Daloft Aerospace · Internal Workspace</div>
      </div>
    </div>
  );
}
