import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/api";

function getIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function ExpandableText({ text, maxLines = 3, maxChars = 130, isAlert = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!text || !text.trim() || text.trim() === "—") {
    return <span style={{ color: "#9ca9a3" }}>—</span>;
  }

  const trimmed = text.trim();
  const isLong = trimmed.length > maxChars || trimmed.split("\n").length > maxLines;

  return (
    <div style={{ fontSize: "12px", lineHeight: "1.55", wordBreak: "break-word" }}>
      <div
        style={{
          whiteSpace: "pre-wrap",
          ...(!expanded && isLong
            ? {
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }
            : {}),
        }}
      >
        {trimmed}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          style={{
            background: "none",
            border: "none",
            padding: "3px 0 0",
            fontSize: "11px",
            fontWeight: "600",
            color: isAlert ? "#c62828" : "#207e54",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "2px",
          }}
        >
          {expanded ? "Show less ▴" : "Show more ▾"}
        </button>
      )}
    </div>
  );
}

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
  const [exportOpen, setExportOpen] = useState(false);
  const [topbarTarget, setTopbarTarget] = useState(null);
  const dropdownRef = useRef(null);

  // Locate topbar actions container in DOM
  useEffect(() => {
    const el = document.getElementById("topbar-actions");
    if (el) setTopbarTarget(el);
  }, []);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Quick preset calculations
  const todayIso = getIsoDate(new Date());

  const now = new Date();
  const day = now.getDay();
  const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
  const mondayIso = getIsoDate(new Date(now.getFullYear(), now.getMonth(), diffToMonday));
  const sundayIso = getIsoDate(new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6));

  const firstDayIso = getIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const lastDayIso = getIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const isTodayActive = fromDate === todayIso && toDate === todayIso;
  const isWeekActive = fromDate === mondayIso && toDate === sundayIso;
  const isMonthActive = fromDate === firstDayIso && toDate === lastDayIso;

  function applyPresetToday() {
    setFromDate(todayIso);
    setToDate(todayIso);
  }

  function applyPresetThisWeek() {
    setFromDate(mondayIso);
    setToDate(sundayIso);
  }

  function applyPresetThisMonth() {
    setFromDate(firstDayIso);
    setToDate(lastDayIso);
  }

  function handleClearFilters() {
    setFromDate("");
    setToDate("");
    setSelectedEmployeeId("");
  }

  const hasActiveFilters = Boolean(fromDate || toDate || selectedEmployeeId);

  const filteredRoster = employeesSummary.filter((emp) => {
    const q = searchQuery.toLowerCase();
    return (
      (emp.name && emp.name.toLowerCase().includes(q)) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q))
    );
  });

  const selectedEmployeeObj = employeesSummary.find((e) => e.employeeId === selectedEmployeeId);

  // Grouped Export Dropdown UI
  const exportDropdownContent = (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setExportOpen((prev) => !prev)}
        disabled={downloading}
        aria-label="Export Daily Reports"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          borderRadius: "8px",
          border: "1px solid #cad8cf",
          background: "#ffffff",
          color: "#163a2b",
          fontSize: "12px",
          fontWeight: "600",
          cursor: downloading ? "wait" : "pointer",
          boxShadow: "0 1px 2px rgba(18,45,30,0.05)",
          transition: "all 0.15s ease",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>{downloading ? "Exporting..." : "Export"}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: exportOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {exportOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "225px",
            background: "#ffffff",
            border: "1px solid #d4ded8",
            borderRadius: "10px",
            boxShadow: "0 10px 24px rgba(15,35,25,0.12), 0 2px 6px rgba(0,0,0,0.04)",
            padding: "5px",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setExportOpen(false);
              handleExportEmployeeWise();
            }}
            disabled={downloading}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              width: "100%",
              padding: "7px 10px",
              borderRadius: "7px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f7f3")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#163a2a", display: "flex", alignItems: "center", gap: "6px" }}>
              📊 Employee-Wise Excel
            </span>
            <span style={{ fontSize: "10px", color: "#6b7d75", marginTop: "2px" }}>
              {selectedEmployeeObj ? `Export records for ${selectedEmployeeObj.name}` : "Consolidated by employee"}
            </span>
          </button>

          <div style={{ height: "1px", background: "#edf2ee", margin: "2px 0" }} />

          <button
            type="button"
            onClick={() => {
              setExportOpen(false);
              handleExportDateWise();
            }}
            disabled={downloading}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "left",
              width: "100%",
              padding: "7px 10px",
              borderRadius: "7px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f7f3")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#163a2a", display: "flex", alignItems: "center", gap: "6px" }}>
              📅 Date-Wise Excel
            </span>
            <span style={{ fontSize: "10px", color: "#6b7d75", marginTop: "2px" }}>
              {fromDate || toDate ? `${fromDate || "Start"} to ${toDate || "End"}` : "Consolidated by date range"}
            </span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="daily-reports-admin-workspace" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Portal export dropdown into top application navigation bar next to admin profile */}
      {topbarTarget && createPortal(exportDropdownContent, topbarTarget)}

      {/* Clean Title & Subtitle directly underneath */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#142820", margin: 0, letterSpacing: "-0.01em" }}>
            Daily Work Reports
          </h2>
          <p style={{ fontSize: "12.5px", color: "#62746c", margin: "3px 0 0" }}>
            View employee-wise and date-wise daily work submissions, review blockers, and track activity.
          </p>
        </div>

        {/* Fallback inline export buttons if topbar portal is not mounted */}
        {!topbarTarget && exportDropdownContent}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Main Split Layout: Compact Roster Sidebar + Main Reports Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: "290px minmax(0, 1fr)", gap: "16px", alignItems: "start" }}>
        
        {/* Left Employee Roster Sidebar */}
        <div
          className="card"
          style={{
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            maxHeight: "calc(100vh - 130px)",
            borderRadius: "14px",
            border: "1px solid #dce5e0",
            overflow: "hidden",
          }}
        >
          {/* Sticky Header Section */}
          <div style={{ flexShrink: 0, paddingBottom: "10px", borderBottom: "1px solid #edf2ee" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", margin: 0, color: "#162a21" }}>Employee Roster</h3>
                <span style={{ fontSize: "10.5px", background: "#eef5f1", color: "#22563e", padding: "1px 6px", borderRadius: "8px", fontWeight: "700" }}>
                  {employeesSummary.length}
                </span>
              </div>
            </div>

            {/* Sticky Search Bar */}
            <div style={{ position: "relative" }}>
              <svg
                style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#8a9a93", pointerEvents: "none" }}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search employee, ID, or dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 28px",
                  borderRadius: "8px",
                  border: "1px solid #d3ded8",
                  fontSize: "11.5px",
                  background: "#fafcfb",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Scrollable Employee List */}
          <div
            style={{
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              paddingTop: "8px",
              paddingRight: "2px",
              flex: 1,
            }}
          >
            {/* All Employees Option */}
            <button
              type="button"
              onClick={() => setSelectedEmployeeId("")}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: "9px",
                border: "1px solid " + (selectedEmployeeId === "" ? "#2fa876" : "#e5ebe7"),
                background: selectedEmployeeId === "" ? "#edf7f2" : "#ffffff",
                cursor: "pointer",
                transition: "all 0.12s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "12.5px", color: selectedEmployeeId === "" ? "#13402d" : "#172922" }}>
                  All Employees
                </strong>
                <span
                  style={{
                    fontSize: "10px",
                    background: selectedEmployeeId === "" ? "#2fa876" : "#e4ede7",
                    color: selectedEmployeeId === "" ? "#ffffff" : "#244d3b",
                    padding: "1px 6px",
                    borderRadius: "8px",
                    fontWeight: "700",
                  }}
                >
                  {employeesSummary.reduce((acc, emp) => acc + (emp.totalReports || 0), 0)}
                </span>
              </div>
              <div style={{ fontSize: "10.5px", color: "#74867e", marginTop: "2px" }}>
                Full organization records
              </div>
            </button>

            {loadingRoster ? (
              <div style={{ padding: "20px", textAlign: "center", fontSize: "11.5px", color: "#889690" }}>
                Loading roster…
              </div>
            ) : filteredRoster.length === 0 ? (
              <div style={{ padding: "18px 10px", textAlign: "center", fontSize: "11px", color: "#8a9b93" }}>
                No employees match "{searchQuery}"
              </div>
            ) : (
              filteredRoster.map((emp) => {
                const active = selectedEmployeeId === emp.employeeId;
                const submittedToday = emp.lastReportDate === todayIso;
                return (
                  <button
                    key={emp.employeeId}
                    type="button"
                    onClick={() => setSelectedEmployeeId(emp.employeeId)}
                    style={{
                      textAlign: "left",
                      padding: "7px 10px",
                      borderRadius: "9px",
                      border: "1px solid " + (active ? "#2fa876" : "#e6ece8"),
                      background: active ? "#edf7f2" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {/* Name + Submission Count Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong
                        style={{
                          fontSize: "12.5px",
                          color: active ? "#123b2a" : "#192d24",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "180px",
                        }}
                      >
                        {emp.name}
                      </strong>
                      <span
                        style={{
                          fontSize: "10px",
                          background: active ? "#2fa876" : "#e4ebe6",
                          color: active ? "#ffffff" : "#244d3b",
                          padding: "1px 6px",
                          borderRadius: "8px",
                          fontWeight: "700",
                          flexShrink: 0,
                        }}
                      >
                        {emp.totalReports || 0}
                      </span>
                    </div>

                    {/* Department / ID + Status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10.5px", color: "#71827a" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                        {emp.employeeId} · {emp.department || "—"}
                      </span>
                      {submittedToday ? (
                        <span style={{ fontSize: "9.5px", fontWeight: "700", background: "#e6f5ec", color: "#198754", padding: "1px 5px", borderRadius: "4px" }}>
                          Today
                        </span>
                      ) : emp.lastReportDate ? (
                        <span style={{ fontSize: "9.5px", color: "#7a8a83" }}>
                          {emp.lastReportDate}
                        </span>
                      ) : (
                        <span style={{ fontSize: "9.5px", color: "#9daaa4" }}>
                          No reports
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Reports Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
          
          {/* Main Workspace Header: Two-Row Layout */}
          <div
            className="card"
            style={{
              padding: "14px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              borderRadius: "14px",
              border: "1px solid #dce5e0",
            }}
          >
            {/* Top Row: Employee Name, Department Badge, Submission Count Pill */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                <strong style={{ fontSize: "15px", color: "#142c22", fontWeight: "700" }}>
                  {selectedEmployeeObj ? `${selectedEmployeeObj.name} (${selectedEmployeeObj.employeeId})` : "All Employees"}
                </strong>

                {/* Department Badge */}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    padding: "3px 9px",
                    borderRadius: "6px",
                    background: "#edf5f0",
                    color: "#1d523a",
                    border: "1px solid #d3e5dc",
                  }}
                >
                  {selectedEmployeeObj ? selectedEmployeeObj.department : "All Departments"}
                </span>

                {/* Submission Count Pill */}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: "#e6f4ec",
                    color: "#126a42",
                    border: "1px solid #b7dfc9",
                  }}
                >
                  Total Submissions: {selectedEmployeeObj ? (selectedEmployeeObj.totalReports || 0) : reports.length}
                </span>
              </div>

              {/* Filtered Record Count Indicator */}
              <div style={{ fontSize: "11px", color: "#6b7c75" }}>
                {loadingReports ? "Syncing reports…" : `Showing ${reports.length} report${reports.length === 1 ? "" : "s"}`}
              </div>
            </div>

            {/* Divider between Top Row and Bottom Row */}
            <div style={{ height: "1px", background: "#edf2ee" }} />

            {/* Bottom Row: Date Range Filter Controls + Quick Presets + Clear Filters */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              
              {/* Date Inputs & Quick Presets Group */}
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                {/* From Date */}
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "10.5px", color: "#596c64", fontWeight: "700" }}>FROM</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{
                      padding: "6px 9px",
                      borderRadius: "7px",
                      border: "1px solid #ccd8d2",
                      fontSize: "11.5px",
                      background: "#fafcfb",
                    }}
                  />
                </div>

                {/* To Date */}
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "10.5px", color: "#596c64", fontWeight: "700" }}>TO</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{
                      padding: "6px 9px",
                      borderRadius: "7px",
                      border: "1px solid #ccd8d2",
                      fontSize: "11.5px",
                      background: "#fafcfb",
                    }}
                  />
                </div>

                {/* Presets Separator */}
                <div style={{ width: "1px", height: "18px", background: "#dbe4df", margin: "0 2px" }} />

                {/* Quick Presets: Today, This Week, This Month */}
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={applyPresetToday}
                    style={{
                      fontSize: "11px",
                      padding: "5px 9px",
                      borderRadius: "6px",
                      border: "1px solid " + (isTodayActive ? "#2fa876" : "#d3ded8"),
                      background: isTodayActive ? "#eaf5ef" : "#ffffff",
                      color: isTodayActive ? "#185038" : "#3e5249",
                      fontWeight: isTodayActive ? "700" : "500",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetThisWeek}
                    style={{
                      fontSize: "11px",
                      padding: "5px 9px",
                      borderRadius: "6px",
                      border: "1px solid " + (isWeekActive ? "#2fa876" : "#d3ded8"),
                      background: isWeekActive ? "#eaf5ef" : "#ffffff",
                      color: isWeekActive ? "#185038" : "#3e5249",
                      fontWeight: isWeekActive ? "700" : "500",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetThisMonth}
                    style={{
                      fontSize: "11px",
                      padding: "5px 9px",
                      borderRadius: "6px",
                      border: "1px solid " + (isMonthActive ? "#2fa876" : "#d3ded8"),
                      background: isMonthActive ? "#eaf5ef" : "#ffffff",
                      color: isMonthActive ? "#185038" : "#3e5249",
                      fontWeight: isMonthActive ? "700" : "500",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  >
                    This Month
                  </button>
                </div>
              </div>

              {/* Clear Filters Button Aligned Cleanly to the Right */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  style={{
                    fontSize: "11px",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid #f2c7c5",
                    background: "#fff6f6",
                    color: "#c62828",
                    fontWeight: "600",
                    cursor: "pointer",
                    marginLeft: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>✕</span> Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Main Table Card */}
          <div
            className="card"
            style={{
              padding: "0",
              borderRadius: "14px",
              border: "1px solid #dce5e0",
              overflow: "hidden",
            }}
          >
            {loadingReports ? (
              <div style={{ padding: "50px 20px", textAlign: "center", fontSize: "13px", color: "#6b7d75" }}>
                Loading work reports…
              </div>
            ) : (
              <div className="table-wrap" style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    minWidth: "960px",
                    tableLayout: "fixed",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                  }}
                >
                  <colgroup>
                    {/* Fixed compact widths for Date, Employee, Plan, Equipment, Submitted */}
                    {/* Flexible room for Tasks (36%) and Blockers (24%) */}
                    <col style={{ width: "95px" }} />
                    <col style={{ width: "150px" }} />
                    <col style={{ width: "36%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "115px" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "#f8faf9", borderBottom: "1px solid #e5ebe8" }}>
                      <th style={{ fontSize: "11px", fontWeight: "700", color: "#5b6e66", padding: "11px 12px", textAlign: "left" }}>Date</th>
                      <th style={{ fontSize: "11px", fontWeight: "700", color: "#5b6e66", padding: "11px 12px", textAlign: "left" }}>Employee</th>
                      <th style={{ fontSize: "11px", fontWeight: "700", color: "#5b6e66", padding: "11px 12px", textAlign: "left" }}>Tasks Completed & Learnings</th>
                      <th style={{ fontSize: "11px", fontWeight: "700", color: "#5b6e66", padding: "11px 12px", textAlign: "left" }}>Blockers / Issues</th>
                      <th style={{ fontSize: "11px", fontWeight: "700", color: "#5b6e66", padding: "11px 12px", textAlign: "left" }}>Plan for Tomorrow</th>
                      <th style={{ fontSize: "11px", fontWeight: "700", color: "#5b6e66", padding: "11px 12px", textAlign: "left" }}>Equipment Used</th>
                      <th style={{ fontSize: "11px", fontWeight: "700", color: "#5b6e66", padding: "11px 12px", textAlign: "left" }}>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => {
                      const emp = r.employee || {};
                      const hasBlocker = r.blockers && r.blockers.trim().toLowerCase() !== "none" && r.blockers.trim() !== "n/a" && r.blockers.trim() !== "nil" && r.blockers.trim() !== "—";
                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: "1px solid #edf2ef",
                            verticalAlign: "top",
                            transition: "background 0.12s ease",
                          }}
                        >
                          {/* Date */}
                          <td style={{ fontSize: "12.5px", fontWeight: "600", color: "#192e25", padding: "12px", whiteSpace: "nowrap" }}>
                            {r.reportDate}
                          </td>

                          {/* Employee */}
                          <td style={{ padding: "12px" }}>
                            <strong style={{ fontSize: "12.5px", color: "#162f24", display: "block", wordBreak: "break-word" }}>
                              {emp.name || "—"}
                            </strong>
                            <div style={{ fontSize: "10.5px", color: "#74867e", marginTop: "2px", wordBreak: "break-word" }}>
                              {emp.employeeId || "—"} · {emp.department || "—"}
                            </div>
                          </td>

                          {/* Tasks Completed & Learnings (Flexible 36%) */}
                          <td style={{ padding: "12px" }}>
                            <ExpandableText text={r.tasksCompleted} maxLines={3} maxChars={140} />
                          </td>

                          {/* Blockers / Issues (Flexible 24%) */}
                          <td style={{ padding: "12px", color: hasBlocker ? "#b71c1c" : "#2d3d36" }}>
                            {hasBlocker && (
                              <div style={{ marginBottom: "4px" }}>
                                <span
                                  style={{
                                    background: "#ffebee",
                                    color: "#c62828",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "9.5px",
                                    fontWeight: "700",
                                    letterSpacing: "0.03em",
                                    display: "inline-block",
                                  }}
                                >
                                  ALERT
                                </span>
                              </div>
                            )}
                            <ExpandableText text={r.blockers} maxLines={3} maxChars={100} isAlert={hasBlocker} />
                          </td>

                          {/* Plan for Tomorrow */}
                          <td style={{ padding: "12px" }}>
                            <ExpandableText text={r.planForTomorrow} maxLines={3} maxChars={110} />
                          </td>

                          {/* Equipment Used */}
                          <td style={{ fontSize: "11.5px", color: "#3a4d45", padding: "12px", wordBreak: "break-word" }}>
                            {r.equipmentsUsed && r.equipmentsUsed.trim() ? r.equipmentsUsed : <span style={{ color: "#9caaa4" }}>N/A</span>}
                          </td>

                          {/* Submitted At */}
                          <td style={{ fontSize: "11px", color: "#73857e", padding: "12px", whiteSpace: "nowrap" }}>
                            {r.createdAt ? new Date(r.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Empty State Spanning All 7 Columns Full Width */}
                    {!reports.length && (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: "52px 20px",
                            textAlign: "center",
                            verticalAlign: "middle",
                            background: "transparent",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              margin: "0 auto",
                              maxWidth: "440px",
                            }}
                          >
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                background: "#edf5f1",
                                display: "grid",
                                placeItems: "center",
                                color: "#366a52",
                                marginBottom: "4px",
                              }}
                            >
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </div>
                            <strong style={{ fontSize: "14px", color: "#182c22", fontWeight: "700" }}>
                              No work reports found for the selected criteria
                            </strong>
                            <p style={{ margin: 0, fontSize: "12px", color: "#6b7d75", lineHeight: "1.5" }}>
                              No daily work submissions match the current employee or date filters. Try selecting a different employee or expanding your date range.
                            </p>
                          </div>
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

