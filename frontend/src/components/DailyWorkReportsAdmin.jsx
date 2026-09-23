import React, { useEffect, useState } from "react";
import api from "../api/api";

export default function DailyWorkReportsAdmin() {
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    departmentId: "",
    employeeId: "",
    date: "",
    from: "",
    to: "",
  });
  const [loadingReports, setLoadingReports] = useState(false);
  const [downloadingReports, setDownloadingReports] = useState(false);
  const [error, setError] = useState("");

  // Load department + employee options once
  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled([
          api.getAdminDailyReportEmployees(),
          api.adminDepartments(),
        ]);
        setEmployees(
          results[0].status === "fulfilled"
            ? Array.isArray(results[0].value)
              ? results[0].value
              : []
            : [],
        );
        setDepartments(
          results[1].status === "fulfilled"
            ? Array.isArray(results[1].value)
              ? results[1].value
              : []
            : [],
        );
        if (results.some((r) => r.status === "rejected")) {
          setError(
            "Some filter options are temporarily unavailable. Reports remain viewable.",
          );
        }
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const loadDailyReports = async (f = filters) => {
    setLoadingReports(true);
    setError("");
    try {
    
      const rangeFrom = f.date || f.from;
      const rangeTo = f.date || f.to;
      const data = await api.getAdminDailyReports({
        employeeId: f.employeeId,
        from: rangeFrom,
        to: rangeTo,
      });
      let rows = Array.isArray(data) ? data : [];

      if (f.departmentId) {
        const dep = departments.find(
          (d) => String(d.id) === String(f.departmentId),
        );
        const depName = dep ? (dep.name || "").trim().toLowerCase() : null;
        if (depName) {
          rows = rows.filter(
            (r) =>
              ((r.employee && r.employee.department) || "")
                .trim()
                .toLowerCase() === depName,
          );
        }
      }
      setReports(rows);
    } catch (e) {
      setError(e.message || "Unable to load daily work reports.");
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadDailyReports(filters);
    
  }, []);

  const handleApplyReportFilters = (e) => {
    if (e) e.preventDefault();
    loadDailyReports(filters);
  };

  const handleResetReportFilters = () => {
    const emptyFilters = {
      departmentId: "",
      employeeId: "",
      date: "",
      from: "",
      to: "",
    };
    setFilters(emptyFilters);
    loadDailyReports(emptyFilters);
  };

  const handleExportReports = async () => {
    setDownloadingReports(true);
    try {
      const from = filters.date || filters.from;
      const to = filters.date || filters.to;
      await api.downloadEmployeeWiseDailyReportExcel(
        filters.employeeId,
        from,
        to,
      );
    } catch (e) {
      setError(e.message || "Failed to download daily reports.");
    } finally {
      setDownloadingReports(false);
    }
  };

  // Employee dropdown options, narrowed by the selected department
  const selectedDepName = filters.departmentId
    ? (
        departments.find((d) => String(d.id) === String(filters.departmentId))
          ?.name || ""
      )
        .trim()
        .toLowerCase()
    : "";
  const employeeOptions = selectedDepName
    ? employees.filter(
        (e) => (e.department || "").trim().toLowerCase() === selectedDepName,
      )
    : employees;

  return (
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
          <h3 style={{ margin: 0 }}>Organization Daily Work Reports</h3>
          <p
            className="muted"
            style={{ margin: "4px 0 0", fontSize: "0.88rem" }}
          >
            Monitor daily learnings, deliverables, blockers, and equipment used
            by employees across the organization.
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

      {/* Filters Form */}
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
            value={filters.departmentId}
            onChange={(e) =>
              setFilters({
                ...filters,
                departmentId: e.target.value,
                employeeId: "",
              })
            }
          >
            <option value="">All Departments</option>
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
            value={filters.employeeId}
            onChange={(e) =>
              setFilters({ ...filters, employeeId: e.target.value })
            }
          >
            <option value="">All Employees</option>
            {employeeOptions.map((e) => (
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
            value={filters.date}
            onChange={(e) =>
              setFilters({ ...filters, date: e.target.value, from: "", to: "" })
            }
          />
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label style={{ fontSize: "0.8rem" }}>From Date</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) =>
              setFilters({ ...filters, from: e.target.value, date: "" })
            }
          />
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label style={{ fontSize: "0.8rem" }}>To Date</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) =>
              setFilters({ ...filters, to: e.target.value, date: "" })
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

      {error && (
        <div className="error-banner" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* Reports List / Table */}
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
                    <div className="muted" style={{ fontSize: "0.78rem" }}>
                      {r.employee?.employeeId} · {r.employee?.department || "—"}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "pre-wrap", minWidth: 200 }}>
                    {r.tasksCompleted || "—"}
                  </td>
                  <td style={{ whiteSpace: "pre-wrap", minWidth: 150 }}>
                    {r.blockers && r.blockers !== "None" ? (
                      <span style={{ color: "#B42318" }}>{r.blockers}</span>
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "pre-wrap", minWidth: 180 }}>
                    {r.planForTomorrow || "—"}
                  </td>
                  <td>
                    <small className="muted">{r.equipmentsUsed || "N/A"}</small>
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
  );
}
