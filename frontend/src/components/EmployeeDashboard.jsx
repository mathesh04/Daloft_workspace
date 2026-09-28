import React, { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import EmployeeInventory from "./EmployeeInventory";
import LeaveManagement from "./LeaveManagement";
import Notifications from "./Notifications";
import DamageReports from "./DamageReports";
import Profile from "./Profile";
import DailyWorkReport from "./DailyWorkReport";
import { StatusBadge, TaskBadge } from "./StatusBadges";
import WorkspaceShell from "./WorkspaceShell";

const OfficeCalendar = lazy(() => import("./OfficeCalendar"));

const IST = "Asia/Kolkata";
function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
function fmtDate(d) {
  if (!d) return "—";
  const x = new Date(d);
  if (isNaN(x)) return "—";
  return x.toLocaleDateString("en-IN", {
    timeZone: IST,
    month: "short",
    day: "numeric",
  });
}

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("home");
  const [now, setNow] = useState(new Date());
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [attendancePolicy, setAttendancePolicy] = useState({
    attendanceEnabled: true,
    checkInEnabled: true,
    checkOutEnabled: true,
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [regularizations, setRegularizations] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        api.myAttendanceToday(),
        api.myAttendanceHistory(),
        api.getAnnouncements(),
        api.myTasks(),
        api.geofenceConfig(),
        api.myAttendanceRegularizations(),
      ]);
      const value = (i, f) =>
        results[i].status === "fulfilled" ? results[i].value : f;
      setToday(value(0, null));
      setHistory(value(1, []));
      setAnnouncements(value(2, []));
      setTasks(value(3, []));
      const geo = value(4, { enabled: false });
      setGeofenceEnabled(!!geo?.enabled);
      setAttendancePolicy({
        attendanceEnabled: geo?.attendanceEnabled !== false,
        checkInEnabled: geo?.checkInEnabled !== false,
        checkOutEnabled: geo?.checkOutEnabled !== false,
      });
      setRegularizations(value(5, []));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);
  const loadNotificationCount = useCallback(async () => {
    try {
      const result = await api.unreadCount();
      setNotificationCount(result?.count || 0);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadNotificationCount();
    const timer = setInterval(loadNotificationCount, 30000);
    return () => clearInterval(timer);
  }, [loadNotificationCount]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error("Location services are not supported by this browser."),
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const {
            latitude,
            longitude,
            accuracy,
            altitude,
            altitudeAccuracy,
            heading,
            speed,
          } = position.coords;
          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            !Number.isFinite(accuracy)
          ) {
            reject(new Error("Could not read a valid current location."));
            return;
          }

          const locationData = {
            latitude,
            longitude,
            accuracy,
            altitude: altitude != null ? altitude : null,
            altitudeAccuracy: altitudeAccuracy != null ? altitudeAccuracy : null,
            heading: heading != null ? heading : null,
            speed: speed != null ? speed : null,
            locationTimestamp: position.timestamp,
            mockDetected: false,
          };

       
          if (accuracy === 0) {
            locationData.mockDetected = true;
          }
          
          if (
            altitude === null &&
            altitudeAccuracy === null &&
            accuracy < 20
          ) {
            locationData.mockDetected = true;
          }

          resolve(locationData);
        },
        (error) => {
          const messages = {
            1: "Location permission was denied. Please allow location access and try again.",
            2: "Your current location could not be determined. Please enable GPS/location services and try again.",
            3: "Location request timed out. Please try again.",
          };
          reject(
            new Error(
              messages[error.code] || "Unable to get your current location.",
            ),
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  async function handleCheckIn() {
    setBusy(true);
    setError("");
    try {
      const location = geofenceEnabled ? await getCurrentLocation() : null;
      await api.checkIn(location);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setBusy(true);
    setError("");
    try {
      const location = geofenceEnabled ? await getCurrentLocation() : null;
      await api.checkOut(location);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleWorkFromHome() {
    setBusy(true);
    setError("");
    try {
      await api.markWorkFromHome();
      await loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function handleWorkFromHomeCheckout() {
    setBusy(true);
    setError("");
    try {
      await api.workFromHomeCheckout();
      await loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleTaskStatus(taskId, status) {
    try {
      await api.updateMyTaskStatus(taskId, status);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const hasCheckedIn = !!today?.checkInTime;
  const hasCheckedOut = !!today?.checkOutTime;
  const firstName = (user?.name || "there").split(" ")[0];
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <WorkspaceShell
      title={
        tab === "home"
          ? `Good morning, ${user.name.split(" ")[0]}`
          : {
              tasks: "My Tasks",
              announcements: "Announcements",
              inventory: "My Inventory",
              leave: "Leave",
              damage: "Damage Reports",
              profile: "My Profile",
              corrections: "Attendance Corrections",
              notifications: "Notifications",
              "daily-report": "Daily Work Report",
              calendar: "Office Calendar",
            }[tab] || "My Workspace"
      }
      subtitle={
        tab === "home"
          ? "Your workday, attendance and priorities at a glance."
          : "Personal workspace for your Daloft People account."
      }
      active={tab}
      onNavigate={setTab}
      navItems={[
        { key: "home", label: "Overview", icon: "home" },
        { key: "daily-report", label: "Daily Work Report", icon: "report" },
        {
          key: "tasks",
          label: "My Tasks",
          icon: "tasks",
          badge: tasks.length || null,
        },
        {
          key: "announcements",
          label: "Announcements",
          icon: "bell",
          badge: announcements.length || null,
        },
        { key: "inventory", label: "My Inventory", icon: "box" },
        { key: "leave", label: "Leave", icon: "leave" },
        { key: "calendar", label: "Office Calendar", icon: "calendar" },
        { key: "damage", label: "Damage Reports", icon: "report" },
        {
          key: "corrections",
          label: "Attendance Corrections",
          icon: "calendar",
          badge: regularizations.length || null,
        },
        { key: "profile", label: "My Profile", icon: "people" },
        {
          key: "notifications",
          label: "Notifications",
          icon: "bell",
          badge: notificationCount || null,
        },
      ]}
      workspaceActions={
        user?.role === "ADMIN" ||
        user?.role === "HR_ADMIN" ||
        user?.role === "MANAGER" ||
        user?.role === "SYSTEM_ADMIN"
          ? [
              {
                label:
                  user.role === "MANAGER"
                    ? "My Departments"
                    : "Admin Workspace",
                icon: "home",
                onClick: () =>
                  navigate(
                    user.role === "MANAGER"
                      ? "/manager"
                      : user.role === "ADMIN" || user.role === "HR_ADMIN"
                        ? "/admin"
                        : "/system",
                  ),
              },
            ]
          : []
      }
    >
      {error && <div className="error-banner">{error}</div>}
      {!attendancePolicy.attendanceEnabled && (
        <div className="error-banner">
          Attendance has been disabled by your organization administrator.
        </div>
      )}
      {tab === "home" && (
        <div className="employee-hero">
          <div className="employee-hero-copy">
            <span className="employee-hero-kicker">
              {now.toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
            <h2>
              {greeting}, {firstName}
            </h2>
            <p>Your workday, attendance and priorities at a glance.</p>
          </div>
          <span
            className={
              "employee-hero-chip " +
              (hasCheckedOut ? "done" : hasCheckedIn ? "active" : "")
            }
          >
            <i />
            {hasCheckedOut
              ? "Day completed"
              : hasCheckedIn
                ? "On the clock"
                : "Not checked in"}
          </span>
        </div>
      )}
      {tab === "home" && (
        <div className="employee-summary-strip">
          <div className="employee-stat">
            <span>Today</span>
            <strong>
              {hasCheckedOut
                ? "Completed"
                : hasCheckedIn
                  ? "Working"
                  : "Not started"}
            </strong>
            <small>
              {today?.status
                ? today.status.replace("_", " ")
                : "Attendance status"}
            </small>
          </div>
          <div className="employee-stat">
            <span>Working time</span>
            <strong>
              {today?.workingMinutes != null
                ? `${Math.floor(today.workingMinutes / 60)}h ${today.workingMinutes % 60}m`
                : "—"}
            </strong>
            <small>Recorded today</small>
          </div>
          <div className="employee-stat">
            <span>My tasks</span>
            <strong>{tasks.length}</strong>
            <small>Assigned work items</small>
          </div>
          <div className="employee-stat">
            <span>Updates</span>
            <strong>{announcements.length + notificationCount}</strong>
            <small>Announcements & alerts</small>
          </div>
        </div>
      )}
      {tab === "home" && (
        <div className="quick-actions">
          <button
            className="quick-action primary"
            onClick={handleCheckIn}
            disabled={
              busy ||
              hasCheckedIn ||
              !attendancePolicy.attendanceEnabled ||
              !attendancePolicy.checkInEnabled
            }
          >
            <span>✓</span>
            <div>
              <strong>{hasCheckedIn ? "Checked in" : "Start workday"}</strong>
              <small>
                {hasCheckedIn ? "Attendance is active" : "Check in now"}
              </small>
            </div>
          </button>
          <button
            className="quick-action"
            onClick={() => setTab("daily-report")}
          >
            <span>✎</span>
            <div>
              <strong>Submit Work Report</strong>
              <small>Daily tasks & learnings</small>
            </div>
          </button>
          <button className="quick-action" onClick={() => setTab("tasks")}>
            <span>↗</span>
            <div>
              <strong>View my tasks</strong>
              <small>{tasks.length} assigned items</small>
            </div>
          </button>
          <button className="quick-action" onClick={() => setTab("leave")}>
            <span>◷</span>
            <div>
              <strong>Request leave</strong>
              <small>Manage your time off</small>
            </div>
          </button>
        </div>
      )}
      {tab === "daily-report" && <DailyWorkReport />}
      {tab === "inventory" && <EmployeeInventory />}
      {tab === "leave" && <LeaveManagement />}
      {tab === "damage" && <DamageReports />}
      {tab === "profile" && <Profile />}
      {tab === "notifications" && (
        <Notifications onCount={setNotificationCount} />
      )}

      {tab === "corrections" && (
        <AttendanceCorrectionPanel
          history={history}
          regularizations={regularizations}
          onSaved={loadAll}
        />
      )}

      {tab === "calendar" && (
        <Suspense
          fallback={
            <div
              style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}
            >
              <div className="loading-spinner" style={{ marginBottom: 10 }} />
              Loading calendar…
            </div>
          }
        >
          <OfficeCalendar viewMode="employee" />
        </Suspense>
      )}

      {tab === "home" && (
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <div className="clock-card">
            <div className="clock-time">
              {now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}
            </div>
            <div className="clock-date">
              {now.toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>

            <div className="clock-status-row">
              <span className="clock-pill">
                Check-in: {fmtTime(today?.checkInTime)}
              </span>
              <span className="clock-pill">
                Check-out: {fmtTime(today?.checkOutTime)}
              </span>

              {today?.workingMinutes != null && (
                <span className="clock-pill">
                  Working: {Math.floor(today.workingMinutes / 60)}h{" "}
                  {today.workingMinutes % 60}m
                </span>
              )}

              {today?.status && (
                <span className="clock-pill">
                  {today.status.replace("_", " ")}
                </span>
              )}
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
              <button
                className="btn btn-accent"
                onClick={handleCheckIn}
                disabled={
                  busy ||
                  hasCheckedIn ||
                  !attendancePolicy.attendanceEnabled ||
                  !attendancePolicy.checkInEnabled
                }
              >
                {hasCheckedIn ? "Checked in" : "Check in"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleCheckOut}
                disabled={
                  busy ||
                  !hasCheckedIn ||
                  hasCheckedOut ||
                  !attendancePolicy.attendanceEnabled ||
                  !attendancePolicy.checkOutEnabled
                }
              >
                {hasCheckedOut ? "Checked out" : "Check out"}
              </button>
            </div>
          </div>

          <div className="card">
            <h3>Recent attendance</h3>
            <div className="table-wrap">
              <table className="emp-attendance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check in / out</th>
                    <th>Worked</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 8).map((row) => (
                    <tr key={row.id}>
                      <td>{fmtDate(row.workDate)}</td>
                      <td className="att-times">
                        {row.checkInTime ? fmtTime(row.checkInTime) : "—"}
                        <span>
                          {row.checkOutTime ? fmtTime(row.checkOutTime) : "—"}
                        </span>
                      </td>
                      <td>
                        {row.workingMinutes != null
                          ? `${Math.floor(row.workingMinutes / 60)}h ${row.workingMinutes % 60}m`
                          : "—"}
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No attendance records yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="grid grid-2">
          {tasks.length === 0 && (
            <div className="empty-state">No tasks assigned to you yet.</div>
          )}
          {tasks.map((t) => (
            <div className="card" key={t.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 10,
                }}
              >
                <h3 style={{ marginBottom: 6 }}>{t.title}</h3>
                <TaskBadge status={t.status} />
              </div>
              {t.description && (
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.88rem",
                    marginBottom: 12,
                  }}
                >
                  {t.description}
                </p>
              )}
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginBottom: 14,
                }}
              >
                Due: {t.dueDate ? fmtDate(t.dueDate) : "No due date"}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {t.status !== "IN_PROGRESS" && t.status !== "COMPLETED" && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleTaskStatus(t.id, "IN_PROGRESS")}
                  >
                    Start
                  </button>
                )}
                {t.status !== "COMPLETED" && (
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={() => handleTaskStatus(t.id, "COMPLETED")}
                  >
                    Mark complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "announcements" && (
        <div className="grid grid-2">
          {announcements.length === 0 && (
            <div className="empty-state">No announcements yet.</div>
          )}
          {announcements.map((a) => (
            <div className="card" key={a.id}>
              <h3>{a.title}</h3>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text)",
                  marginBottom: 10,
                  whiteSpace: "pre-wrap",
                }}
              >
                {a.message}
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {a.postedBy ? `Posted by ${a.postedBy.name} · ` : ""}
                {new Date(a.createdAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

function fmtFullDate(d) {
  if (!d) return "—";
  const x = new Date(`${d}T00:00:00`);
  if (isNaN(x)) return d;
  return x.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AttendanceCorrectionPanel({ history, regularizations, onSaved }) {
  const eligible = (history || []).filter(
    (a) =>
      a?.id && a?.workDate && new Date(`${a.workDate}T00:00:00`) <= new Date(),
  );
  const [attendanceId, setAttendanceId] = useState(eligible[0]?.id || "");
  const selected = eligible.find((a) => String(a.id) === String(attendanceId));
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const first = eligible[0]?.id || "";
    setAttendanceId((v) =>
      eligible.some((a) => String(a.id) === String(v)) ? v : first,
    );
  }, [history]);
  useEffect(() => {
    setCheckIn(selected?.checkInTime ? selected.checkInTime.slice(0, 16) : "");
    setCheckOut(
      selected?.checkOutTime ? selected.checkOutTime.slice(0, 16) : "",
    );
  }, [selected?.id, selected?.checkInTime, selected?.checkOutTime]);
  const submit = async (e) => {
    e.preventDefault();
    if (!selected?.id)
      return setMessage("Select an attendance record to regularize.");
    setBusy(true);
    setMessage("");
    try {
      await api.createAttendanceRegularization({
        attendanceId: selected.id,
        requestedCheckIn: checkIn || null,
        requestedCheckOut: checkOut || null,
        reason,
      });
      setMessage("Correction request submitted to your manager.");
      setReason("");
      await onSaved();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  const statusLabel = (s) => String(s || "").replace(/_/g, " ");
  return (
    <div className="dashboard-stack" style={{ maxWidth: 880 }}>
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Request attendance correction</h3>
            <p className="section-sub">
              Select the attendance date that needs correction. Your manager
              must approve the request.
            </p>
          </div>
        </div>
        {message && (
          <div
            className={
              message.includes("submitted") ? "success-banner" : "error-banner"
            }
          >
            {message}
          </div>
        )}
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="correction-date">Attendance date</label>
            <select
              id="correction-date"
              value={attendanceId}
              onChange={(e) => setAttendanceId(e.target.value)}
              disabled={!eligible.length}
            >
              <option value="">
                {eligible.length ? "Select date" : "No eligible attendance records"}
              </option>
              {eligible.map((a) => (
                <option key={a.id} value={a.id}>
                  {fmtFullDate(a.workDate)}
                  {a.status ? ` · ${statusLabel(a.status)}` : ""}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div
              className="leave-range-preview"
              style={{
                margin: "0 0 15px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 650,
                  color: "var(--text-muted)",
                }}
              >
                Selected attendance
              </span>
              <span
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  gap: "2px 14px",
                  fontSize: 12.5,
                }}
              >
                <b style={{ color: "var(--ink)" }}>
                  {fmtFullDate(selected.workDate)}
                  {selected.status ? ` · ${statusLabel(selected.status)}` : ""}
                </b>
                <span>Check-in: {fmtTime(selected.checkInTime)}</span>
                <span>Check-out: {fmtTime(selected.checkOutTime)}</span>
              </span>
            </div>
          )}

          <div className="form-grid" style={{ marginTop: 0 }}>
            <div className="field">
              <label htmlFor="correction-check-in">Requested check-in</label>
              <input
                id="correction-check-in"
                type="datetime-local"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="correction-check-out">Requested check-out</label>
              <input
                id="correction-check-out"
                type="datetime-local"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="correction-reason">Reason for correction</label>
            <textarea
              id="correction-reason"
              required
              placeholder="Explain why this attendance record needs correction"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn btn-accent"
              disabled={busy || !selected?.id}
            >
              {busy ? "Submitting…" : "Submit correction"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>My correction requests</h3>
            <p className="section-sub">
              {regularizations.length} request
              {regularizations.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {regularizations.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {regularizations.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtFullDate(r.attendance?.workDate)}</td>
                    <td>
                      {r.requestedCheckIn ? fmtTime(r.requestedCheckIn) : "—"}
                      {" → "}
                      {r.requestedCheckOut ? fmtTime(r.requestedCheckOut) : "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.status === "APPROVED"
                            ? "badge-success"
                            : r.status === "REJECTED" || r.status === "CANCELLED"
                              ? "badge-danger"
                              : "badge-neutral"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>{r.reviewReason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No correction requests.</div>
        )}
      </div>
    </div>
  );
}