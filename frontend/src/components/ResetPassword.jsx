import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import { DaloftBrand } from "./WorkspaceShell";

export default function ResetPassword() {
  const token = new URLSearchParams(useLocation().search).get("token");
  const nav = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const r = await api.resetPassword(token, password);
      setMsg(
        (r && r.message) ||
          "Your password has been reset successfully. Redirecting to sign in..."
      );
      setTimeout(() => nav("/login", { replace: true }), 2000);
    } catch (x) {
      setErr(x.message || "Could not reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="daloft-login">

      <main className="login-main">
        <section className="login-container">

          <div className="login-brand-mark">
            <DaloftBrand />
          </div>

          <div className="login-heading">
            <h1>Create a new password</h1>
            <p>
              Choose a strong password with at least 8 characters to secure
              your account.
            </p>
          </div>

          {!token && (
            <div className="login-error" role="alert">
              This reset link is invalid — the token is missing. Please request
              a new reset link.
            </div>
          )}

          {err && (
            <div className="login-error" role="alert">
              {err}
            </div>
          )}

          {msg && (
            <div
              role="status"
              style={{
                background: "#EFF8F1",
                border: "1px solid #CDE9D4",
                color: "#166534",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                marginBottom: "16px",
                lineHeight: "1.4",
                fontWeight: "500"
              }}
            >
              {msg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">

            <div className="login-field login-field-password">
              <label htmlFor="reset-password">
                New password
              </label>
              <div className="login-password-wrap">
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength="8"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.5 0-9.5-4-11-8 1.15-2.7 3.05-5.02 5.5-6.56" />
                      <path d="M9.9 4.24A10.8 10.8 0 0 1 12 4c5.5 0 9.5 4 11 8-.5 1.18-1.16 2.29-1.95 3.28" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="reset-confirm-password">
                Confirm password
              </label>
              <div className="login-password-wrap">
                <input
                  id="reset-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength="8"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.5 0-9.5-4-11-8 1.15-2.7 3.05-5.02 5.5-6.56" />
                      <path d="M9.9 4.24A10.8 10.8 0 0 1 12 4c5.5 0 9.5 4 11 8-.5 1.18-1.16 2.29-1.95 3.28" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading || !token}
            >
              {loading ? "Resetting password..." : "Reset password"}
            </button>

            <div className="login-forgot" style={{ justifyContent: "center", marginTop: "18px" }}>
              <Link to="/forgot-password">Request a new reset link</Link>
            </div>

            <div className="login-forgot" style={{ justifyContent: "center" }}>
              <Link to="/login">Back to sign in</Link>
            </div>

          </form>
        </section>
      </main>

      <footer className="login-footer">
        Daloft Aerospace · Internal Workspace
      </footer>

    </div>
  );
}
