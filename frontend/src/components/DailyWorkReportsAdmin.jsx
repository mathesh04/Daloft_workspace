import React, { useCallback, useEffect, useState } from "react";
import api from "../api/api";

export default function DailyWorkReportsAdmin() {
  const [employeesSummary, setEmployeesSummary] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const loadRoster = useCallback(async () => {
    setLoadingRoster(true);
    try {
      const roster = await api.getAdminDailyReportEmployees();
      setEmployeesSummary(Array.isArray(roster) ? roster : []);
    } catch (err) {
      setError(err.message || "Failed to load employee roster");
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setError("");
    try {
      const data = await api.getAdminDailyReports({
        employeeId: selectedEmployeeId,
        from: fromDate,
        to: toDate,
      });
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load daily work reports");
    } finally {
      setLoadingReports(false);
    }
  }, [selectedEmployeeId, fromDate, toDate]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function handleExportEmployeeWise() {
    setDownloading(true);
    try {
      await api.downloadEmployeeWiseDailyReportExcel(selectedEmployeeId, fromDate, toDate);
    } catch (err) {
      setError("Failed to download employee-wise Excel: " + err.message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleExportDateWise() {
    setDownloading(true);
    try {
      await api.downloadDateWiseDailyReportExcel(fromDate || toDate, fromDate, toDate);
    } catch (err) {
      setError("Failed to download date-wise Excel: " + err.message);
    } finally {
      setDownloading(false);
    }
  }

  const filteredRoster = employeesSummary.filter((emp) => {
    const q = searchQuery.toLowerCase();
    return (
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q))
    );
  });

  const selectedEmployeeObj = employeesSummary.find((e) => e.employeeId === selectedEmployeeId);

  return (
    <div className="daily-reports-admin-workspace" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Banner */}
      <div className="premium-card" style={{ background: "linear-gradient(135deg, #0f2b20, #194d38)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", padding: "24px 28px" }}>
        <div>
          <span className="eyebrow green" style={{ color: "#7ee4aa", fontSize: "11px" }}>WORKFORCE OPERATIONS</span>
          <h2 style={{ color: "#fff", margin: "6px 0 8px", fontSize: "24px" }}>Daily Work Reports Governance</h2>
          <p style={{ color: "#abcfbe", margin: 0, fontSize: "12px", maxWidth: "680px" }}>
            View employee-wise and date-wise daily work submissions, review blockers, and export reports in Excel format.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn btn-accent" onClick={handleExportEmployeeWise} disabled={downloading} style={{ fontSize: "12px", padding: "10px 16px" }}>
            {downloading ? "Preparing..." : "📊 Export Employee-Wise Excel"}
          </button>
          <button className="btn btn-primary" onClick={handleExportDateWise} disabled={downloading} style={{ fontSize: "12px", padding: "10px 16px" }}>
            {downloading ? "Preparing..." : "📅 Export Date-Wise Excel"}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Main Split Layout: Roster Sidebar + Main Reports Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0, 1fr)", gap: "20px", alignItems: "start" }}>
        
        {/* Left Roster Panel */}
        <div className="card" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "850px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "16px", margin: 0 }}>Employee Roster</h3>
            <span style={{ fontSize: "11px", color: "#7a8a83", fontWeight: "bold" }}>{employeesSummary.length} Employees</span>
          </div>

          <input
            type="text"
            placeholder="Search employee, ID, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dce4e0", fontSize: "12px" }}
          />

          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "720px", paddingRight: "4px" }}>
            <button
              onClick={() => setSelectedEmployeeId("")}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid " + (selectedEmployeeId === "" ? "#2fa876" : "#e5ebe7"),
                background: selectedEmployeeId === "" ? "#eef8f3" : "#fff",
                cursor: "pointer",
                boxShadow: selectedEmployeeId === "" ? "0 2px 8px rgba(47,168,118,0.12)" : "none",
              }}
            >
              <strong style={{ fontSize: "13px", color: "#143a2b", display: "block" }}>All Employees</strong>
              <small style={{ fontSize: "10px", color: "#7a8a83" }}>View full organization submissions</small>
            </button>

            {loadingRoster ? (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "#889690" }}>Loading employees…</div>
            ) : (
              filteredRoster.map((emp) => {
                const active = selectedEmployeeId === emp.employeeId;
                return (
                  <button
                    key={emp.employeeId}
                    onClick={() => setSelectedEmployeeId(emp.employeeId)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1px solid " + (active ? "#2fa876" : "#e8eee9"),
                      background: active ? "#eef8f3" : "#fff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      boxShadow: active ? "0 2px 8px rgba(47,168,118,0.12)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "13px", color: "#1c2e27" }}>{emp.name}</strong>
                      <span style={{ fontSize: "10px", background: active ? "#2fa876" : "#e0ebe5", color: active ? "#fff" : "#2d5442", padding: "3px 8px", borderRadius: "99px", fontWeight: "bold" }}>
                        {emp.totalReports}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#7b8a83" }}>
                      <span>{emp.employeeId} · {emp.department}</span>
                      <span style={{ fontWeight: emp.lastReportDate ? "600" : "normal" }}>{emp.lastReportDate ? emp.lastReportDate : "No reports"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Table & Filter Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", minWidth: 0 }}>
          {/* Filter Bar */}
          <div className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px" }}>
            <div>
              <strong style={{ fontSize: "16px", color: "#173427", display: "block" }}>
                {selectedEmployeeObj ? (selectedEmployeeObj.name + " (" + selectedEmployeeObj.employeeId + ")") : "All Employees Daily Work Reports"}
              </strong>
              <span style={{ fontSize: "12px", color: "#61746c" }}>
                {selectedEmployeeObj ? ("Department: " + selectedEmployeeObj.department + " · Total Submissions: " + selectedEmployeeObj.totalReports) : "Showing filtered submission records"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginLeft: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#54665f", fontWeight: "bold" }}>FROM</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "9px", border: "1px solid #d0dad5", fontSize: "12px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#54665f", fontWeight: "bold" }}>TO</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "9px", border: "1px solid #d0dad5", fontSize: "12px" }} />
              </div>
              {(fromDate || toDate || selectedEmployeeId) && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setSelectedEmployeeId("");
                  }}
                  style={{ fontSize: "11px", padding: "8px 12px" }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Main Table Card */}
          <div className="card" style={{ padding: "16px" }}>
            {loadingReports ? (
              <div className="empty-state" style={{ padding: "40px", fontSize: "13px" }}>Loading work reports…</div>
            ) : (
              <div className="table-wrap">
                <table style={{ width: "100%", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: "11px", padding: "12px 10px" }}>Date</th>
                      <th style={{ fontSize: "11px", padding: "12px 10px" }}>Employee</th>
                      <th style={{ fontSize: "11px", padding: "12px 10px" }}>Tasks Completed & Learnings</th>
                      <th style={{ fontSize: "11px", padding: "12px 10px" }}>Blockers / Issues</th>
                      <th style={{ fontSize: "11px", padding: "12px 10px" }}>Plan for Tomorrow</th>
                      <th style={{ fontSize: "11px", padding: "12px 10px" }}>Equipment Used</th>
                      <th style={{ fontSize: "11px", padding: "12px 10px" }}>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => {
                      const emp = r.employee || {};
                      const hasBlocker = r.blockers && r.blockers.trim().toLowerCase() !== "none" && r.blockers.trim() !== "N/A";
                      return (
                        <tr key={r.id}>
                          <td style={{ fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", padding: "12px 10px" }}>
                            {r.reportDate}
                          </td>
                          <td style={{ padding: "12px 10px", minWidth: "140px" }}>
                            <strong style={{ fontSize: "13px", color: "#142c22", display: "block" }}>{emp.name || "—"}</strong>
                            <div style={{ fontSize: "10px", color: "#74857e", marginTop: "2px" }}>{emp.employeeId || "—"} · {emp.department || "—"}</div>
                          </td>
                          <td style={{ maxWidth: "320px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: "1.55", padding: "12px 10px" }}>
                            {r.tasksCompleted}
                          </td>
                          <td style={{ maxWidth: "200px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: "1.55", padding: "12px 10px", color: hasBlocker ? "#c62828" : "#3b4d45", fontWeight: hasBlocker ? "600" : "normal" }}>
                            {hasBlocker && (
                              <span style={{ background: "#ffebee", color: "#c62828", padding: "3px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "bold", marginRight: "6px", display: "inline-block", marginBottom: "4px" }}>
                                ALERT
                              </span>
                            )}
                            {r.blockers}
                          </td>
                          <td style={{ maxWidth: "240px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: "1.55", padding: "12px 10px" }}>
                            {r.planForTomorrow}
                          </td>
                          <td style={{ fontSize: "12px", padding: "12px 10px" }}>
                            {r.equipmentsUsed || "N/A"}
                          </td>
                          <td style={{ fontSize: "11px", color: "#75857f", whiteSpace: "nowrap", padding: "12px 10px" }}>
                            {r.createdAt ? new Date(r.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {!reports.length && (
                      <tr>
                        <td colSpan="7" className="empty-state" style={{ padding: "40px", fontSize: "13px" }}>
                          No work reports found for the selected criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
