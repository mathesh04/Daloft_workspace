import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DaloftBrand } from "./WorkspaceShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const user = await login(
        employeeId.trim(),
        password
      );

      navigate(
        user.role === "SYSTEM_ADMIN"
          ? "/system"
          : user.role === "ADMIN" || user.role === "HR_ADMIN"
            ? "/admin"
            : user.role === "MANAGER"
              ? "/manager"
              : "/employee"
      );
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="daloft-login">

      {/* Top company logo */}
      <header className="login-header">
        <div className="login-company-logo">
          <DaloftBrand />
        </div>
      </header>

      {/* Login content */}
      <main className="login-main">
        <section className="login-container">

          {/* Daloft logo */}
          <div className="login-brand-mark">
            <DaloftBrand />
          </div>

          {/* Heading */}
          <div className="login-heading">            
            <h1>
              Sign in to your Daloft People workspace
            </h1>
            <p>Log in to your account</p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="login-error"
              role="alert"
            >
              {error}
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
                onChange={(e) =>
                  setEmployeeId(e.target.value)
                }
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="login-password">
                Password
              </label>

              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                required
              />
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

            {/* Sign in */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>

            {/* Forgot password */}
            <div className="login-forgot">
              <Link to="/forgot-password">
                Forgot password?
              </Link>
            </div>

          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        Daloft Aerospace · Internal Workspace
      </footer>

    </div>
  );
}