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
      navigate(user.role === "SYSTEM_ADMIN" ? "/system" : user.role === "HR_ADMIN" ? "/admin" : user.role === "MANAGER" ? "/manager" : "/employee");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="daloft-login">
      <section className="login-visual">
        <div className="login-visual-top"><DaloftBrand/></div>
        <div className="login-visual-copy"><span className="eyebrow green">DALOFT AEROSPACE PRIVATE LIMITED</span><h1>People operations,<br/><em>built for precision.</em></h1><div className="login-drone-frame"><img src="/assets/daloft-drone.png" alt="Daloft Aerospace unmanned aircraft" /></div><p>Attendance, workforce operations, tasks and organization controls — connected in one secure workspace.</p><div className="login-trust-row"><span>✓ Role-based access</span><span>✓ Secure sessions</span><span>✓ Enterprise audit trail</span></div></div>
        <div className="login-orbit"><span/><span/><span/></div>
        <small className="login-visual-foot">DALOFT AEROSPACE PRIVATE LIMITED · Daloft People</small>
      </section>
      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="login-mobile-brand"><DaloftBrand/></div>
          <span className="eyebrow green">SECURE ACCESS</span>
          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">Sign in to your Daloft People workspace.</p>
          {error && <div className="error-banner" role="alert">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field"><label htmlFor="login-employee-id">Employee ID</label><input id="login-employee-id" type="text" placeholder="e.g. EMP001" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} autoComplete="username" autoFocus required /></div>
            <div className="field"><label htmlFor="login-password">Password</label><input id="login-password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></div>
            <button className="login-submit" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in to workspace →"}</button>
            <div className="login-help"><Link to="/forgot-password">Forgot password?</Link></div>
          </form>
          <div className="login-security-note"><span>●</span><div><strong>Protected workspace</strong><small>Your role determines the tools and data you can access.</small></div></div>
        </div>
      </section>
    </div>
  );
}
