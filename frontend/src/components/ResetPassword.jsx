import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
export default function ResetPassword() {
  const token = new URLSearchParams(useLocation().search).get("token");
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) return setErr("Passwords do not match");
    try {
      await api.resetPassword(token, password);
      nav("/login");
    } catch (x) {
      setErr(x.message);
    }
  }
  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h2>Create a new password</h2>
        {err && <div className="error-banner">{err}</div>}
        <input
          type="password"
          placeholder="New password (min. 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength="8"
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button className="btn btn-primary">Reset password</button>
      </form>
    </div>
  );
}
