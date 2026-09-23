import React, { useEffect, useState } from "react";
import api from "../api/api";
import { istDateTime, relativeIST } from "../utils/datetime";

export default function Notifications({ onCount }) {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [unread, setUnread] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setError("");
    try {
      const r = await api.myNotifications({
        category,
        priority,
        unreadOnly: unread || undefined,
      });
      setItems(r || []);
    } catch (e) {
      setError(e.message || "Unable to load notifications.");
    }
    try {
      const c = await api.unreadCount();
      onCount?.(c?.count || 0);
    } catch {}
  };

  useEffect(() => {
    load();
  }, [category, priority, unread]);

  async function remove(id) {
    if (busyId) return;
    const snapshot = items;
    setItems((prev) => prev.filter((n) => n.id !== id));
    setBusyId(id);
    try {
      await api.deleteNotification(id);
      onCount?.(
        Math.max(
          0,
          snapshot.filter((n) => !n.readStatus).length -
            (snapshot.find((n) => n.id === id && !n.readStatus) ? 1 : 0),
        ),
      );
    } catch (e) {
      setItems(snapshot);
      setError(
        e.message || "The notification could not be deleted. Please try again.",
      );
    } finally {
      setBusyId(null);
      load();
    }
  }

  async function read(id) {
    if (busyId) return;
    const snapshot = items;
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readStatus: true } : n)),
    );
    setBusyId(id);
    try {
      await api.readNotification(id);
    } catch (e) {
      setItems(snapshot);
      setError(e.message || "Could not mark the notification as read.");
    } finally {
      setBusyId(null);
      load();
    }
  }

  async function all() {
    if (busyId) return;
    setBusyId("all");
    try {
      await api.readAllNotifications();
      onCount?.(0);
    } catch (e) {
      setError(e.message || "Could not mark notifications as read.");
    } finally {
      setBusyId(null);
      load();
    }
  }

  const tone = (p) => {
    const v = String(p || "MEDIUM").toLowerCase();
    return ["high", "critical"].includes(v)
      ? "high"
      : v === "low"
        ? "low"
        : "medium";
  };

  return (
    <div className="prod-panel">
      <div className="notif-head">
        <div>
          <h2>Notification Center</h2>
          <p className="section-sub">
            Filter, prioritize and manage operational alerts.
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm notif-mark-all"
          onClick={all}
          disabled={busyId === "all"}
        >
          {busyId === "all" ? "Marking…" : "Mark all read"}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      <div className="notif-toolbar">
        <select
          className="notif-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          <option>INVENTORY</option>
          <option>ATTENDANCE</option>
          <option>LEAVE</option>
          <option>TASK</option>
          <option>SECURITY</option>
          <option>SYSTEM</option>
        </select>
        <select
          className="notif-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          <option>LOW</option>
          <option>MEDIUM</option>
          <option>HIGH</option>
          <option>CRITICAL</option>
        </select>
        <label className="notif-unread-toggle">
          <input
            type="checkbox"
            checked={unread}
            onChange={(e) => setUnread(e.target.checked)}
          />{" "}
          Unread only
        </label>
      </div>

      <div className="notification-list">
        {items.map((n) => (
          <div
            className={`notification-item ${n.readStatus ? "" : "unread"}`}
            key={n.id}
          >
            <span className={`notif-icon notif-${tone(n.priority)}`}>
              {String(n.category || n.type || "SYSTEM").toLowerCase() ===
              "leave"
                ? "◷"
                : String(n.category || n.type || "").toLowerCase() === "task"
                  ? "✓"
                  : String(n.category || n.type || "").toLowerCase() ===
                      "inventory"
                    ? "▦"
                    : String(n.category || n.type || "").toLowerCase() ===
                        "attendance"
                      ? "⏱"
                      : "•"}
            </span>
            <div className="notification-body">
              <div className="notification-title">
                <b>{n.title}</b>
                <span>
                  {n.category || n.type} · {n.priority || "MEDIUM"}
                </span>
              </div>
              <p>{n.message}</p>
              <small title={istDateTime(n.createdAt)}>
                {n.createdAt ? relativeIST(n.createdAt) : ""}
              </small>
            </div>
            <div className="notification-actions">
              {!n.readStatus && (
                <button
                  className="btn-link"
                  onClick={() => read(n.id)}
                  disabled={busyId === n.id}
                >
                  Mark read
                </button>
              )}
              <button
                className="btn-link danger"
                onClick={() => remove(n.id)}
                disabled={busyId === n.id}
              >
                {busyId === n.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
        {!items.length && (
          <div className="empty-state">
            No notifications match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
