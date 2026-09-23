import React, { useEffect, useState } from "react";
import api from "../api/api";

export default function Announcements({ adminMode }) {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  async function load() {
    try {
      setAnnouncements(await api.getAnnouncements());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePost(e) {
    e.preventDefault();
    setPosting(true);
    setError("");
    try {
      await api.createAnnouncement(title, message);
      setTitle("");
      setMessage("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteAnnouncement(id);
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <div
        className="grid"
        style={{
          gridTemplateColumns: adminMode ? "340px 1fr" : "1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {adminMode && (
          <div className="card">
            <h3>Post an announcement</h3>
            <form onSubmit={handlePost}>
              <div className="field">
                <label>Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>
              <div className="field">
                <label>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  required
                />
              </div>
              <button
                className="btn btn-accent"
                type="submit"
                style={{ width: "100%" }}
                disabled={posting}
              >
                {posting ? "Posting…" : "Post announcement"}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-2">
          {announcements.length === 0 && (
            <div className="empty-state">No announcements yet.</div>
          )}
          {announcements.map((a) => (
            <div className="card" key={a.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 10,
                }}
              >
                <h3>{a.title}</h3>
                {adminMode && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setConfirmId(a.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text)",
                  margin: "8px 0",
                  whiteSpace: "pre-wrap",
                }}
              >
                {a.message}
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {a.postedBy ? `Posted by ${a.postedBy.name} · ` : ""}
                {new Date(a.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {confirmId && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) =>
            e.target === e.currentTarget && setConfirmId(null)
          }
        >
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h3>Delete announcement</h3>
              <button
                className="modal-close"
                onClick={() => setConfirmId(null)}
              >
                ×
              </button>
            </div>
            <p className="confirm-copy">
              Are you sure you want to remove this announcement?
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger-solid"
                onClick={() => handleDelete(confirmId)}
              >
                Delete announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
