import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DaloftBrand } from "./WorkspaceShell";

export default function Login() {
  const { login, sessionNotice, clearSessionNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    clearSessionNotice();
    setLoading(true);

    try {
      const user = await login(
        employeeId.trim(),
        password
      );

      const targetPath = location.state?.from?.pathname;
      const defaultPath = user.role === "SYSTEM_ADMIN"
        ? "/system"
        : user.role === "ADMIN" || user.role === "HR_ADMIN"
          ? "/admin"
          : user.role === "MANAGER"
            ? "/manager"
            : "/employee";

      navigate(targetPath && targetPath !== "/login" ? targetPath : defaultPath, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
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
            <div className="login-brand-name">Daloft People</div>
            <div className="login-brand-tagline">Employee workspace</div>
          </div>

          
          <div className="login-heading">
            <h1>
              Welcome back
            </h1>
            <p>Sign in to continue to your Daloft People workspace.</p>
          </div>

          
          {error && (
            <div
              className="login-error"
              role="alert"
            >
              {error}
            </div>
          )}

          
          {!error && sessionNotice && (
            <div
              className="login-session-notice"
              role="status"
              style={{
                background: "#FEF6EE",
                border: "1px solid #F9DBAF",
                color: "#93370D",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                lineHeight: "1.4",
                fontWeight: "500"
              }}
            >
              <span style={{ fontSize: "16px" }}></span>
              <span>{sessionNotice}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="login-form"
          >

            {/* Employee ID */}
            <div className="login-field">
              <label htmlFor="login-employee-id">
                Employee ID
              </label>

              <input
                id="login-employee-id"
                type="text"
                placeholder="Enter your employee ID"
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  if (sessionNotice) clearSessionNotice();
                }}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            
            <div className="login-field login-field-password">
              <label htmlFor="login-password">
                Password
              </label>

              <div className="login-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (sessionNotice) clearSessionNotice();
                  }}
                  autoComplete="current-password"
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

            
            <div className="login-forgot">
              <Link to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            {/* Remember */}
            <div className="login-remember-row">
              <label className="login-remember">

                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) =>
                    setRemember(e.target.checked)
                  }
                />

                <span>
                  Remember for 30 days
                </span>

              </label>
            </div>

            
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>

          </form>
        </section>
      </main>

      
      <footer className="login-footer">
        Daloft Aerospace · Internal Workspace
      </footer>

    </div>
  );
}
