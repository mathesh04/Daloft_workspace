import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import WorkspaceShell from "./WorkspaceShell";
import api from "../api/api";

const EmployeeList = lazy(() => import("./EmployeeList"));
const AttendanceTable = lazy(() => import("./AttendanceTable"));
const Announcements = lazy(() => import("./Announcements"));
const Tasks = lazy(() => import("./Tasks"));
const Inventory = lazy(() => import("./Inventory"));
const LeaveManagement = lazy(() => import("./LeaveManagement"));
const Notifications = lazy(() => import("./Notifications"));
const DamageReports = lazy(() => import("./DamageReports"));
const OfficeLocations = lazy(() => import("./OfficeLocations"));
const Reports = lazy(() => import("./Reports"));
const SystemAdminPanel = lazy(() => import("./SystemAdminPanel"));
const AnalyticsDashboard = lazy(() => import("./AnalyticsDashboard"));
const DailyWorkReportsAdmin = lazy(() => import("./DailyWorkReportsAdmin"));
const OfficeCalendar = lazy(() => import("./OfficeCalendar"));

const MODULES = [
  {
    key: "people",
    permission: "PEOPLE",
    label: "People",
    icon: "people",
    component: EmployeeList,
  },
  {
    key: "attendance",
    permission: "ATTENDANCE",
    label: "Attendance",
    icon: "calendar",
    component: AttendanceTable,
  },
  {
    key: "leave",
    permission: "LEAVE",
    label: "Leave Management",
    icon: "leave",
    component: LeaveManagement,
  },
  {
    key: "daily-reports",
    permission: "REPORTS",
    label: "Daily Work Reports",
    icon: "report",
    component: DailyWorkReportsAdmin,
  },
  {
    key: "tasks",
    permission: "TASKS",
    label: "Tasks",
    icon: "tasks",
    component: Tasks,
  },
  {
    key: "announcements",
    permission: "COMMUNICATION",
    label: "Announcements",
    icon: "bell",
    component: Announcements,
  },
  {
    key: "office-calendar",
    permission: "HOLIDAY_CALENDAR",
    label: "Office Calendar",
    icon: "calendar",
    component: OfficeCalendar,
  },
  {
    key: "inventory",
    permission: "INVENTORY",
    label: "Inventory",
    icon: "box",
    component: Inventory,
  },
  {
    key: "damage",
    permission: "PEOPLE",
    label: "Damage Reports",
    icon: "report",
    component: DamageReports,
  },
  {
    key: "offices",
    permission: "OFFICE",
    label: "Office Locations",
    icon: "location",
    component: OfficeLocations,
  },
  {
    key: "reports",
    permission: "REPORTS",
    label: "Reports & Analytics",
    icon: "report",
    component: Reports,
  },
];

const SYSTEM_NAV = [
  { key: "system", label: "Control Center", icon: "home" },
  { key: "employees", label: "Administrators", icon: "people" },
  { key: "organization", label: "Organization", icon: "people" },
  { key: "office-calendar", label: "Office Calendar", icon: "calendar" },
  { key: "tasks", label: "Tasks", icon: "tasks" },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "daily-reports", label: "Daily Work Reports", icon: "report" },
  { key: "fraud-alerts", label: "Location Fraud", icon: "alert" },
  { key: "security", label: "Security Center", icon: "shield" },
  { key: "audit", label: "Audit Logs", icon: "audit" },
  { key: "offices", label: "Offices & Geofences", icon: "location" },
  { key: "settings", label: "Configuration", icon: "settings" },
  { key: "health", label: "System Health", icon: "report" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const system = user?.role === "SYSTEM_ADMIN";
  const routeModule = location.pathname.startsWith("/admin/")
    ? location.pathname.split("/")[2]
    : null;
  const [tab, setTab] = useState(
    system ? "system" : routeModule || "dashboard",
  );
  const [permissions, setPermissions] = useState(system ? ["ALL"] : []);
  const [loadingAccess, setLoadingAccess] = useState(!system);
  const [accessError, setAccessError] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [fraudCount, setFraudCount] = useState(0);

  useEffect(() => {
    if (system) return;
    let alive = true;
    api
      .adminAccessMe()
      .then((x) => {
        if (alive) setPermissions(x?.permissions || []);
      })
      .catch((e) => alive && setAccessError(e.message))
      .finally(() => alive && setLoadingAccess(false));
    return () => {
      alive = false;
    };
  }, [system]);
  useEffect(() => {
    api
      .unreadCount()
      .then((r) => setNotificationCount(r?.count || 0))
      .catch(() => {});
    if (system) {
      api
        .locationFraudUnreviewed()
        .then((r) => setFraudCount(r?.count || 0))
        .catch(() => {});
    }
  }, [system]);
  const has = (key) =>
    system || permissions.includes("ALL") || permissions.includes(key);
  const allowed = useMemo(
    () => MODULES.filter((m) => has(m.permission)),
    [permissions, system],
  );
  const routeEntry = routeModule
    ? MODULES.find((m) => m.key === routeModule)
    : null;
  const routeDenied =
    !!routeModule &&
    routeModule !== "notifications" &&
    (!routeEntry || !has(routeEntry.permission));

  const select = (key) => {
    setTab(key);
    if (!system && key !== "dashboard" && key !== "notifications")
      navigate(`/admin/${key}`);
    if (!system && key === "dashboard") navigate("/admin");
  };
  const title = system
    ? SYSTEM_NAV.find((x) => x.key === tab)?.label || "Control Center"
    : tab === "dashboard"
      ? "Operations"
      : allowed.find((x) => x.key === tab)?.label || "Operations";
  const subtitle =
    tab === "daily-reports"
      ? "Review daily work submissions, track team activities, and export records."
      : tab === "office-calendar"
        ? "Govern organization working schedules, active public holidays, employee leaves, and remote days."
        : system
          ? "Govern organization policy, security, people and platform health."
          : "A focused, data-first workspace for people operations.";
  const nav = system
    ? SYSTEM_NAV.map((item) =>
        item.key === "fraud-alerts"
          ? { ...item, badge: fraudCount || null }
          : item,
      )
    : [
        { key: "dashboard", label: "Overview", icon: "home" },
        ...allowed.map((m) => ({ key: m.key, label: m.label, icon: m.icon })),
        {
          key: "notifications",
          label: "Notifications",
          icon: "bell",
          badge: notificationCount || null,
        },
      ];
  const actions = !system
    ? [
        {
          label: "My Workspace",
          icon: "home",
          onClick: () => navigate("/employee"),
        },
      ]
    : [];

  return (
    <WorkspaceShell
      title={title}
      subtitle={subtitle}
      navItems={nav}
      active={tab}
      onNavigate={select}
      workspaceActions={actions}
    >
      <Suspense fallback={<LoadingCard text="Loading workspace module…" />}>
        {system ? (
          <SystemWorkspace
            tab={tab}
            setTab={setTab}
            navigate={navigate}
            notificationCount={notificationCount}
            setNotificationCount={setNotificationCount}
          />
        ) : loadingAccess ? (
          <LoadingCard text="Loading your delegated access…" />
        ) : routeDenied ? (
          <AccessDenied onBack={() => select("dashboard")} />
        ) : (
          <>
            {accessError && (
              <div className="error-banner">
                Unable to load delegated access: {accessError}
              </div>
            )}
            {tab === "dashboard" &&
              (has("REPORTS") ? (
                <AnalyticsDashboard />
              ) : (
                <DelegatedOverview permissions={permissions} />
              ))}
            {allowed.map((m) => {
              const Component = m.component;
              return tab === m.key ? <Component key={m.key} adminMode /> : null;
            })}
            {tab === "notifications" && (
              <Notifications onCount={setNotificationCount} />
            )}
          </>
        )}
      </Suspense>
    </WorkspaceShell>
  );
}

function SystemWorkspace({
  tab,
  setTab,
  navigate,
  notificationCount,
  setNotificationCount,
}) {
  const select = (key) => {
    setTab(key);
    if (key === "notifications") return;
  };
  return (
    <>
      {tab === "system" && <SystemAdminPanel section="control" />}
      {tab === "employees" && <EmployeeList />}
      {tab === "offices" && <SystemAdminPanel section="offices" />}
      {tab === "organization" && <SystemAdminPanel section="organization" />}
      {tab === "daily-reports" && <DailyWorkReportsAdmin />}
      {tab === "fraud-alerts" && <LocationFraudPanel />}
      {tab === "security" && <SystemAdminPanel section="security" />}
      {tab === "audit" && <SystemAdminPanel section="audit" />}
      {tab === "settings" && <SystemAdminPanel section="settings" />}
      {(tab === "office-calendar" || tab === "holidays") && <OfficeCalendar />}
      {tab === "health" && <SystemAdminPanel section="health" />}
      {tab === "tasks" && <Tasks adminMode systemAdminMode canBroadcastRoles />}
      {tab === "notifications" && (
        <Notifications onCount={setNotificationCount} />
      )}
    </>
  );
}

function DelegatedOverview({ permissions }) {
  const names = {
    PEOPLE: "People",
    ATTENDANCE: "Attendance",
    LEAVE: "Leave Management",
    INVENTORY: "Inventory",
    TASKS: "Tasks",
    COMMUNICATION: "Announcements",
    REPORTS: "Reports & Analytics",
    OFFICE: "Office Locations",
    HOLIDAY_CALENDAR: "Office Calendar",
  };
  return (
    <div className="premium-card access-home">
      <span className="eyebrow green">DELEGATED WORKSPACE</span>
      <h2>Welcome to Daloft People</h2>
      <p className="section-sub">
        Your Organization Admin has granted access only to the functions shown
        below. Analytics and reporting are available when the Reports &
        Analytics permission is granted.
      </p>
      <div className="module-cards">
        {permissions.length ? (
          permissions
            .filter((p) => names[p])
            .map((p) => (
              <div className="module-card" key={p}>
                <strong>{names[p]}</strong>
                <span>Organization-wide access</span>
              </div>
            ))
        ) : (
          <div className="empty-state" style={{ gridColumn: "1/-1" }}>
            No functional permissions are currently assigned. Contact the
            Organization Admin to request access.
          </div>
        )}
      </div>
    </div>
  );
}
function LoadingCard({ text }) {
  return (
    <div className="premium-card loading-card">
      <div className="loading-spinner" />
      <strong>{text}</strong>
      <span>Secure workspace access is being synchronized.</span>
    </div>
  );
}
function AccessDenied({ onBack }) {
  return (
    <div className="premium-card access-denied">
      <span className="eyebrow">SECURITY POLICY</span>
      <h2>403 — Access denied</h2>
      <p>You do not have permission to access this workspace module.</p>
      <button className="btn btn-primary" onClick={onBack}>
        Back to overview
      </button>
    </div>
  );
}

function LocationFraudPanel() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("unreviewed");
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = filter === "unreviewed"
        ? await api.locationFraudUnreviewedList()
        : await api.locationFraudAll();
      setAlerts(data || []);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const handleReview = async (id) => {
    try {
      await api.reviewLocationFraud(id, adminNotes);
      setReviewingId(null);
      setAdminNotes("");
      setMessage("Alert marked as reviewed.");
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const severityColor = (s) => {
    switch ((s || "").toUpperCase()) {
      case "CRITICAL": return "#dc2626";
      case "HIGH": return "#ea580c";
      case "MEDIUM": return "#ca8a04";
      case "LOW": return "#16a34a";
      default: return "var(--text-muted)";
    }
  };

  const fraudTypeLabel = (t) => (t || "").replace(/_/g, " ");

  return (
    <div className="dashboard-stack" style={{ maxWidth: 1100 }}>
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Location Fraud Alerts</h3>
            <p className="section-sub">Suspicious location activity detected during attendance check-in/check-out.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`btn btn-sm ${filter === "unreviewed" ? "btn-accent" : "btn-ghost"}`} onClick={() => setFilter("unreviewed")}>Unreviewed</button>
            <button className={`btn btn-sm ${filter === "all" ? "btn-accent" : "btn-ghost"}`} onClick={() => setFilter("all")}>All alerts</button>
          </div>
        </div>
        {message && <div className={message.includes("reviewed") ? "success-banner" : "error-banner"}>{message}</div>}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            <div className="loading-spinner" style={{ marginBottom: 10 }} />
            Loading alerts…
          </div>
        ) : alerts.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            {filter === "unreviewed" ? "No unreviewed fraud alerts. All clear!" : "No fraud alerts recorded yet."}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Fraud Type</th>
                  <th>Severity</th>
                  <th>Details</th>
                  <th>IP → GPS Distance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.employee?.name || a.employee?.employeeId || "—"}</td>
                    <td style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {a.createdAt ? new Date(a.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—"}
                    </td>
                    <td>{a.eventType}</td>
                    <td style={{ fontWeight: 600 }}>{fraudTypeLabel(a.fraudType)}</td>
                    <td>
                      <span style={{
                        color: "#fff",
                        background: severityColor(a.severity),
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}>{a.severity}</span>
                    </td>
                    <td style={{ fontSize: "0.83rem", maxWidth: 260, wordBreak: "break-word" }}>{a.details || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {a.ipGpsDistanceKm != null && a.ipGpsDistanceKm > 0 ? `${Math.round(a.ipGpsDistanceKm)} km` : "—"}
                      {a.ipCity ? <><br /><small style={{ color: "var(--text-muted)" }}>IP: {a.ipCity}, {a.ipCountry}</small></> : null}
                    </td>
                    <td>
                      {a.reviewed
                        ? <span style={{ color: "var(--success)", fontWeight: 600 }}>Reviewed</span>
                        : <span style={{ color: "var(--danger)", fontWeight: 600 }}>Pending</span>}
                    </td>
                    <td>
                      {!a.reviewed && reviewingId !== a.id && (
                        <button className="btn btn-sm btn-ghost" onClick={() => { setReviewingId(a.id); setAdminNotes(""); }}>Review</button>
                      )}
                      {reviewingId === a.id && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180 }}>
                          <textarea
                            placeholder="Admin notes (optional)"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            style={{ fontSize: "0.82rem", padding: 6, minHeight: 50, resize: "vertical", borderRadius: 6, border: "1px solid var(--border)" }}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-sm btn-accent" onClick={() => handleReview(a.id)}>Confirm</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => setReviewingId(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                      {a.reviewed && a.adminNotes && (
                        <small style={{ color: "var(--text-muted)", display: "block", marginTop: 4 }}>{a.adminNotes}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
