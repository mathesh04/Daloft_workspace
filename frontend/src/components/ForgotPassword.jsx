import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { DaloftBrand } from "./WorkspaceShell";

export default function ForgotPassword() {
  const [identity, setIdentity] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const r = await api.forgotPassword(identity.trim());
      setMsg(
        (r && r.message) ||
          "If that account exists, a password reset link has been sent to your email."
      );
    } catch (x) {
      setErr(x.message || "Could not send the reset link. Please try again.");
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
            <h1>Reset your password</h1>
            <p>
              Enter your employee ID or email and we'll send you a secure link
              to set a new password.
            </p>
          </div>

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

            <div className="login-field">
              <label htmlFor="forgot-identity">
                Employee ID or email
              </label>
              <input
                id="forgot-identity"
                type="text"
                placeholder="Enter your employee ID or email"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? "Sending link..." : "Send reset link"}
            </button>

            <div className="login-forgot" style={{ justifyContent: "center", marginTop: "18px" }}>
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
