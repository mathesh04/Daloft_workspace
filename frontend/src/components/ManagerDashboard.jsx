import React, { useEffect, useState, lazy, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import Tasks from "./Tasks";
import WorkspaceShell from "./WorkspaceShell";

const OfficeCalendar = lazy(() => import("./OfficeCalendar"));

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const [tab, setTab] = useState("departments");
  const [departments, setDepartments] = useState([]);
  const [team, setTeam] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [error, setError] = useState("");


  const [reports, setReports] = useState([]);
  const [reportEmployees, setReportEmployees] = useState([]);
  const [reportFilters, setReportFilters] = useState({
    date: "",
    from: "",
    to: "",
    employeeId: "",
    departmentId: "",
  });
  const [loadingReports, setLoadingReports] = useState(false);
  const [downloadingReports, setDownloadingReports] = useState(false);

  const load = async () => {
    setError("");
    try {
      const results = await Promise.allSettled([
        api.managerDepartments(),
        api.managerTeam(),
        api.managerLeaves(),
        api.managerAttendance(),
        api.managerAttendanceCorrections(),
        api.managerDailyReportEmployees(),
      ]);

      const vals = results.map((r) =>
        r.status === "fulfilled" ? r.value : [],
      );
      setDepartments(vals[0] || []);
      setTeam(vals[1] || []);
      setLeaves(vals[2] || []);
      setAttendance(vals[3] || []);
      setCorrections(vals[4] || []);
      setReportEmployees(vals[5] || []);

      if (results.some((r) => r.status === "rejected")) {
        setError(
          "Some manager data is temporarily unavailable. The available workspace remains usable.",
        );
      }
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const loadDailyReports = async (filters = reportFilters) => {
    setLoadingReports(true);
    try {
      const res = await api.managerDailyReports(filters);
      setReports(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e.message || "Unable to load daily work reports.");
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (tab === "reports") {
      loadDailyReports(reportFilters);
    }
  }, [tab]);

  const handleApplyReportFilters = (e) => {
    if (e) e.preventDefault();
    loadDailyReports(reportFilters);
  };

  const handleResetReportFilters = () => {
    const emptyFilters = {
      date: "",
      from: "",
      to: "",
      employeeId: "",
      departmentId: "",
    };
    setReportFilters(emptyFilters);
    loadDailyReports(emptyFilters);
  };

  const handleExportReports = async () => {
    setDownloadingReports(true);
    try {
      await api.downloadManagerDailyReportsExcel(
        reportFilters,
        `daily-reports-${reportFilters.date || (reportFilters.from ? `${reportFilters.from}-to-${reportFilters.to}` : "all")}.xlsx`,
      );
    } catch (e) {
      alert(e.message || "Failed to download daily reports.");
    } finally {
      setDownloadingReports(false);
    }
  };

  const review = async (id, status) => {
    try {
      let reason = "";
      if (status === "REJECTED") {
        reason = window.prompt("Enter the rejection reason:") || "";
        if (!reason.trim()) return;
      }
      await api.reviewManagerLeave(id, status, reason);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const reviewCorrection = async (id, status) => {
    try {
      let reason = "";
      if (status === "REJECTED") {
        reason = window.prompt("Enter the rejection reason:") || "";
        if (!reason.trim()) return;
      }
      await api.reviewManagerAttendanceCorrection(id, status, reason);
      load();
    } catch (e) {
      setError(e.message);
    }
  };


  const filteredTeam = selectedDeptId
    ? team.filter((e) => {
        const d = departments.find((dept) => dept.id === selectedDeptId);
        if (!d) return true;
        const norm = (e.department || "").trim().toLowerCase();
        return (
          norm === (d.name || "").trim().toLowerCase() ||
          norm === (d.code || "").trim().toLowerCase()
        );
      })
    : team;

  const totalActiveInTeam = team.filter((e) => e.active).length;
  const totalInactiveInTeam = team.length - totalActiveInTeam;

  return (
    <WorkspaceShell
      title={
        tab === "departments"
          ? `Good morning, ${user.name ? user.name.split(" ")[0] : "Manager"}`
          : {
              reports: "Department Daily Reports",
              leaves: "Leave Approvals",
              tasks: "Department Tasks",
              attendance: "Department Attendance",
              corrections: "Attendance Corrections",
              calendar: "Office Calendar",
            }[tab] || "My Departments"
      }
      subtitle="Oversee your assigned departments, workforce roster, daily work reports, approvals and tasks."
      active={tab}
      onNavigate={setTab}
      navItems={[
        {
          key: "departments",
          label: "My Departments",
          icon: "people",
          badge: departments.length || team.length || null,
        },
        { key: "reports", label: "Daily Reports", icon: "report" },
        {
          key: "leaves",
          label: "Leave Approvals",
          icon: "leave",
          badge: leaves.length || null,
        },
        { key: "tasks", label: "Department Tasks", icon: "tasks" },
        { key: "attendance", label: "Team Attendance", icon: "calendar" },
        {
          key: "corrections",
          label: "Attendance Corrections",
          icon: "calendar",
          badge: corrections.length || null,
        },
        { key: "calendar", label: "Office Calendar", icon: "calendar" },
      ]}
      workspaceActions={[
        {
          label: "My Workspace",
          icon: "home",
          onClick: () => nav("/employee"),
        },
      ]}
    >
      {error && <div className="error-banner">{error}</div>}

      {}
      {tab === "departments" && (
        <>
          <div className="manager-metrics">
            <div className="employee-stat">
              <span>Managed departments</span>
              <strong>{departments.length}</strong>
              <small>Under your leadership</small>
            </div>
            <div className="employee-stat">
              <span>Total workforce</span>
              <strong>{team.length}</strong>
              <small>
                {totalActiveInTeam} active · {totalInactiveInTeam} inactive
              </small>
            </div>
            <div className="employee-stat">
              <span>Leave approvals</span>
              <strong>{leaves.length}</strong>
              <small>Awaiting your review</small>
            </div>
            <div className="employee-stat">
              <span>Corrections</span>
              <strong>{corrections.length}</strong>
              <small>Pending regularization</small>
            </div>
          </div>

          <div className="manager-hero-grid">
            <div className="premium-card manager-focus">
              <span className="eyebrow green">DEPARTMENT OVERVIEW</span>
              <h2>Your departments at a glance</h2>
              <p>
                Strictly scoped to your assigned departments. Click a department
                card or pill to filter your workforce roster.
              </p>
              <div className="manager-mini-grid">
                <div>
                  <strong>{totalActiveInTeam}</strong>
                  <span>Active Members</span>
                </div>
                <div>
                  <strong>{totalInactiveInTeam}</strong>
                  <span>Inactive Members</span>
                </div>
                <div>
                  <strong>
                    {attendance.filter((a) => a.checkInTime).length}
                  </strong>
                  <span>Checked In Today</span>
                </div>
              </div>
            </div>

            <div className="premium-card manager-action-card">
              <span className="eyebrow">QUICK NAVIGATION</span>
              <button onClick={() => setTab("reports")}>
                View daily work reports <b>→</b>
              </button>
              <button onClick={() => setTab("tasks")}>
                Assign department tasks <b>→</b>
              </button>
              <button onClick={() => setTab("leaves")}>
                Review leave requests <b>→</b>
              </button>
            </div>
          </div>

          {}
          <div style={{ marginTop: 24, marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
                Assigned Departments
              </h3>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                {departments.length} assigned
              </span>
            </div>

            {departments.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                No departments are currently assigned to your manager account.
                Please contact your Organization Admin.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 16,
                }}
              >
                {departments.map((d) => {
                  const isSelected = selectedDeptId === d.id;
                  return (
                    <div
                      key={d.id}
                      className="card"
                      onClick={() =>
                        setSelectedDeptId(isSelected ? null : d.id)
                      }
                      style={{
                        padding: 18,
                        cursor: "pointer",
                        border: isSelected
                          ? "2px solid #2563EB"
                          : "1px solid var(--line)",
                        backgroundColor: isSelected
                          ? "rgba(37, 99, 235, 0.05)"
                          : "#FFFFFF",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <b
                            style={{
                              fontSize: "1.05rem",
                              color: isSelected ? "#1E4FBF" : "inherit",
                            }}
                          >
                            {d.name}
                          </b>
                          {d.code && (
                            <div
                              className="muted"
                              style={{ fontSize: "0.8rem", marginTop: 2 }}
                            >
                              Code: {d.code}
                            </div>
                          )}
                        </div>
                        <span
                          className={`badge ${d.active ? "badge-success" : "badge-danger"}`}
                        >
                          {d.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 16,
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: "1px solid var(--line)",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                            {d.totalEmployees ?? 0}
                          </div>
                          <small className="muted">Total Members</small>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "1.2rem",
                              fontWeight: 700,
                              color: "#1E4FBF",
                            }}
                          >
                            {d.activeEmployees ?? 0}
                          </div>
                          <small className="muted">Active</small>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {}
          <div className="card" style={{ marginTop: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>Workforce Under My Responsibility</h3>
                <small className="muted">
                  Showing {filteredTeam.length} employee
                  {filteredTeam.length === 1 ? "" : "s"}
                </small>
              </div>
              <div className="tabs" style={{ margin: 0 }}>
                <button
                  className={`tab-btn ${selectedDeptId === null ? "active" : ""}`}
                  onClick={() => setSelectedDeptId(null)}
                >
                  All Departments ({team.length})
                </button>
                {departments.map((d) => (
                  <button
                    key={d.id}
                    className={`tab-btn ${selectedDeptId === d.id ? "active" : ""}`}
                    onClick={() => setSelectedDeptId(d.id)}
                  >
                    {d.name} (
                    {d.totalEmployees ??
                      team.filter(
                        (e) =>
                          (e.department || "").trim().toLowerCase() ===
                          (d.name || "").trim().toLowerCase(),
                      ).length}
                    )
                  </button>
                ))}
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeam.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <b>{e.name}</b>
                        <div className="muted">{e.employeeId}</div>
                      </td>
                      <td>
                        <span
                          className={`badge ${e.role === "INTERN" ? "badge-warning" : "badge-neutral"}`}
                        >
                          {e.role}
                        </span>
                      </td>
                      <td>{e.department || "—"}</td>
                      <td>{e.designation || "—"}</td>
                      <td>
                        <span
                          className={`badge ${e.active ? "badge-success" : "badge-danger"}`}
                        >
                          {e.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!filteredTeam.length && (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No employees found in{" "}
                        {selectedDeptId
                          ? "the selected department"
                          : "your assigned departments"}
                        .
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {}
      {tab === "reports" && (
        <KeepAlive active={tab === "reports"}>
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>Department Daily Work Reports</h3>
                <p
                  className="muted"
                  style={{ margin: "4px 0 0", fontSize: "0.88rem" }}
                >
                  Monitor daily learnings, deliverables, blockers, and equipment
                  used by your department members.
                </p>
              </div>
              <button
                className="btn btn-accent btn-sm"
                onClick={handleExportReports}
                disabled={downloadingReports || !reports.length}
              >
                {downloadingReports ? "Exporting…" : "📥 Download Excel"}
              </button>
            </div>

            {}
            <form
              onSubmit={handleApplyReportFilters}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                padding: "14px 16px",
                backgroundColor: "var(--surface-2)",
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem" }}>Department</label>
                <select
                  value={reportFilters.departmentId}
                  onChange={(e) =>
                    setReportFilters({
                      ...reportFilters,
                      departmentId: e.target.value,
                    })
                  }
                >
                  <option value="">All My Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem" }}>Employee</label>
                <select
                  value={reportFilters.employeeId}
                  onChange={(e) =>
                    setReportFilters({
                      ...reportFilters,
                      employeeId: e.target.value,
                    })
                  }
                >
                  <option value="">All Team Members</option>
                  {reportEmployees.map((e) => (
                    <option key={e.employeeId || e.id} value={e.employeeId}>
                      {e.name} ({e.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem" }}>Specific Date</label>
                <input
                  type="date"
                  value={reportFilters.date}
                  onChange={(e) =>
                    setReportFilters({
                      ...reportFilters,
                      date: e.target.value,
                      from: "",
                      to: "",
                    })
                  }
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem" }}>From Date</label>
                <input
                  type="date"
                  value={reportFilters.from}
                  onChange={(e) =>
                    setReportFilters({
                      ...reportFilters,
                      from: e.target.value,
                      date: "",
                    })
                  }
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.8rem" }}>To Date</label>
                <input
                  type="date"
                  value={reportFilters.to}
                  onChange={(e) =>
                    setReportFilters({
                      ...reportFilters,
                      to: e.target.value,
                      date: "",
                    })
                  }
                />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <button
                  className="btn btn-primary btn-sm"
                  type="submit"
                  style={{ flex: 1 }}
                >
                  Filter
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={handleResetReportFilters}
                >
                  Reset
                </button>
              </div>
            </form>

            {}
            {loadingReports ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <div className="loading-spinner" style={{ marginBottom: 10 }} />
                Loading daily reports…
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "110px" }}>Date</th>
                      <th style={{ width: "180px" }}>Employee</th>
                      <th>Tasks Completed / Learnings</th>
                      <th>Blockers / Issues</th>
                      <th>Plan for Tomorrow</th>
                      <th style={{ width: "140px" }}>Equipment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <b>{r.reportDate}</b>
                        </td>
                        <td>
                          <b>{r.employee?.name}</b>
                          <div
                            className="muted"
                            style={{ fontSize: "0.78rem" }}
                          >
                            {r.employee?.employeeId} ·{" "}
                            {r.employee?.department || "—"}
                          </div>
                        </td>
                        <td style={{ whiteSpace: "pre-wrap", minWidth: 200 }}>
                          {r.tasksCompleted || "—"}
                        </td>
                        <td style={{ whiteSpace: "pre-wrap", minWidth: 150 }}>
                          {r.blockers && r.blockers !== "None" ? (
                            <span style={{ color: "#B42318" }}>
                              {r.blockers}
                            </span>
                          ) : (
                            <span className="muted">None</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: "pre-wrap", minWidth: 180 }}>
                          {r.planForTomorrow || "—"}
                        </td>
                        <td>
                          <small className="muted">
                            {r.equipmentsUsed || "N/A"}
                          </small>
                        </td>
                      </tr>
                    ))}
                    {!reports.length && (
                      <tr>
                        <td colSpan="6" className="empty-state">
                          No daily work reports found for the selected criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </KeepAlive>
      )}

      {}
      {tab === "leaves" && (
        <KeepAlive active={tab === "leaves"}>
          <div className="card">
            <h3>Pending team leave requests</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.employee?.name}</b>
                        <div className="muted">
                          {r.employee?.employeeId} ·{" "}
                          {r.employee?.department || "—"}
                        </div>
                      </td>
                      <td>{r.leaveType}</td>
                      <td>
                        {r.startDate} → {r.endDate}
                      </td>
                      <td>{r.reason || "—"}</td>
                      <td>
                        <button
                          className="btn btn-accent btn-sm"
                          onClick={() => review(r.id, "APPROVED")}
                        >
                          Approve
                        </button>{" "}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => review(r.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!leaves.length && (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No pending approvals.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </KeepAlive>
      )}

      {}
      {tab === "tasks" && (
        <KeepAlive active={tab === "tasks"}>
          <Tasks managerMode />
        </KeepAlive>
      )}

      {}
      {tab === "attendance" && (
        <KeepAlive active={tab === "attendance"}>
          <div className="card">
            <h3>Team attendance</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Check in</th>
                    <th>Check out</th>
                    <th>Status</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <b>{a.employee?.name}</b>
                        <div className="muted">
                          {a.employee?.employeeId} ·{" "}
                          {a.employee?.department || "—"}
                        </div>
                      </td>
                      <td>{a.workDate}</td>
                      <td>{a.checkInTime || "—"}</td>
                      <td>{a.checkOutTime || "—"}</td>
                      <td>
                        <span
                          className={`badge ${a.status === "PRESENT" ? "badge-success" : a.status === "LATE" ? "badge-warning" : "badge-neutral"}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td>
                        {a.workingHours != null ? `${a.workingHours} hrs` : "—"}
                      </td>
                    </tr>
                  ))}
                  {!attendance.length && (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        No team attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </KeepAlive>
      )}

      {}
      {tab === "corrections" && (
        <KeepAlive active={tab === "corrections"}>
          <div className="card">
            <h3>Pending attendance corrections</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Requested</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.employee?.name}</b>
                        <div className="muted">
                          {r.employee?.employeeId} ·{" "}
                          {r.employee?.department || "—"}
                        </div>
                      </td>
                      <td>{r.attendance?.workDate || "—"}</td>
                      <td>
                        {r.requestedCheckIn || "—"} →{" "}
                        {r.requestedCheckOut || "—"}
                      </td>
                      <td>{r.reason}</td>
                      <td>
                        <button
                          className="btn btn-accent btn-sm"
                          onClick={() => reviewCorrection(r.id, "APPROVED")}
                        >
                          Approve
                        </button>{" "}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => reviewCorrection(r.id, "REJECTED")}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!corrections.length && (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No pending attendance corrections.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </KeepAlive>
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
          <OfficeCalendar viewMode="manager" />
        </Suspense>
      )}
    </WorkspaceShell>
  );
}

function KeepAlive({ active, children }) {
  const [mounted, setMounted] = useState(active);
  useEffect(() => {
    if (active) setMounted(true);
  }, [active]);
  if (!mounted) return null;
  return <div style={{ display: active ? "block" : "none" }}>{children}</div>;
}
