import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/api";
import { istDateTime } from "../utils/datetime";

function getIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getInitials(name) {
  if (!name) return "EMP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function checkHasBlocker(blockers) {
  if (!blockers) return false;
  const b = blockers.trim().toLowerCase();
  return b !== "" && b !== "none" && b !== "n/a" && b !== "nil" && b !== "—" && b !== "-";
}

function ExpandableText({ text, maxLines = 3, maxChars = 130, isAlert = false }) {
  const [expanded, setExpanded] = useState(false);

  if (!text || !text.trim() || text.trim() === "—") {
    return <span style={{ color: "#67707F" }}>—</span>;
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
            color: isAlert ? "#B42318" : "#12B76A",
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

function ReportCard({ report }) {
  const emp = report.employee || {};
  const hasBlocker = checkHasBlocker(report.blockers);
  const initials = getInitials(emp.name);

  return (
    <article className={`dwr-report-card ${hasBlocker ? "has-blocker" : ""}`}>
      <div className="dwr-report-card-header">
        <div className="dwr-card-person">
          <div className="dwr-avatar">{initials}</div>
          <div className="dwr-card-person-details">
            <span className="dwr-card-person-name">{emp.name || "Unknown Employee"}</span>
            <span className="dwr-card-person-meta">
              {emp.employeeId || "—"} · {emp.department || "No Department"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <span className="dwr-card-date-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {report.reportDate}
          </span>
          {hasBlocker ? (
            <span
              style={{
                background: "#FEF0EE",
                color: "#B42318",
                padding: "2px 7px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.02em",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>🚨</span> BLOCKER
            </span>
          ) : (
            <span
              style={{
                background: "#E9F6EF",
                color: "#3E434D",
                padding: "2px 7px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              ✓ Logged
            </span>
          )}
        </div>
      </div>

      {/* Blockers alert section if present */}
      {hasBlocker && (
        <div className="dwr-blocker-alert-box">
          <div style={{ fontWeight: "700", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px", color: "#B42318" }}>
            <span>⚠️</span> Blockers / Issues Encountered
          </div>
          <ExpandableText text={report.blockers} maxLines={4} maxChars={120} isAlert={true} />
        </div>
      )}

      {/* Tasks Completed & Learnings */}
      <div className="dwr-card-section">
        <span className="dwr-section-title">
          <span>📋</span> Tasks Completed & Learnings
        </span>
        <div className="dwr-tasks-box">
          <ExpandableText text={report.tasksCompleted} maxLines={4} maxChars={150} />
        </div>
      </div>

      {/* Plan for Tomorrow */}
      {report.planForTomorrow && report.planForTomorrow.trim() && report.planForTomorrow.trim() !== "—" && (
        <div className="dwr-card-section">
          <span className="dwr-section-title">
            <span>🎯</span> Plan for Tomorrow
          </span>
          <div className="dwr-tomorrow-box">
            <ExpandableText text={report.planForTomorrow} maxLines={3} maxChars={120} />
          </div>
        </div>
      )}

      {/* Equipment used & submission timestamp footer */}
      <div className="dwr-card-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {report.equipmentsUsed && report.equipmentsUsed.trim() && report.equipmentsUsed.trim() !== "—" ? (
            <span
              style={{
                background: "#E9F6EF",
                color: "#3E434D",
                padding: "2px 7px",
                borderRadius: "5px",
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>🔧</span> {report.equipmentsUsed}
            </span>
          ) : (
            <span style={{ color: "#67707F", fontSize: "11px" }}>No equipment logged</span>
          )}
        </div>

        <div style={{ fontSize: "11.5px", color: "#67707F" }}>
          {report.createdAt ? `Submitted ${istDateTime(report.createdAt)}` : "—"}
        </div>
      </div>
    </article>
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

  // Responsive layout state
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 860 : false));
  const [mobileTab, setMobileTab] = useState("reports"); // "reports" | "roster"
  const [viewMode, setViewMode] = useState("auto"); // "auto" | "cards" | "table"

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 860);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Determine whether to display card layout or table layout
  const showCards = viewMode === "cards" || (viewMode === "auto" && isMobile);

  // KPI Calculations
  const totalSubmissions = reports.length;
  const todaySubmissions = reports.filter((r) => r.reportDate === todayIso).length;
  const activeBlockersCount = reports.filter((r) => checkHasBlocker(r.blockers)).length;
  const uniqueEmployeesInReports = new Set(
    reports.map((r) => r.employee?.employeeId || r.employeeId).filter(Boolean)
  ).size;

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
          border: "1px solid #E7E9ED",
          background: "#FFFFFF",
          color: "#3E434D",
          fontSize: "12px",
          fontWeight: "600",
          cursor: downloading ? "wait" : "pointer",
          boxShadow: "0 1px 2px rgba(18,45,30,0.05)",
          transition: "all 0.15s ease",
          whiteSpace: "nowrap",
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
            width: "max-content",
            maxWidth: "calc(100vw - 32px)",
            minWidth: "220px",
            background: "#FFFFFF",
            border: "1px solid #E7E9ED",
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
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#3E434D", display: "flex", alignItems: "center", gap: "6px" }}>
              📊 Employee-Wise Excel
            </span>
            <span style={{ fontSize: "11px", color: "#67707F", marginTop: "2px" }}>
              {selectedEmployeeObj ? `Export records for ${selectedEmployeeObj.name}` : "Consolidated by employee"}
            </span>
          </button>

          <div style={{ height: "1px", background: "#F9FAFB", margin: "2px 0" }} />

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
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#3E434D", display: "flex", alignItems: "center", gap: "6px" }}>
              📅 Date-Wise Excel
            </span>
            <span style={{ fontSize: "11px", color: "#67707F", marginTop: "2px" }}>
              {fromDate || toDate ? `${fromDate || "Start"} to ${toDate || "End"}` : "Consolidated by date range"}
            </span>
          </button>
        </div>
      )}
    </div>
  );

  // Roster Sidebar / List Content
  const rosterContent = (
    <div className="card dwr-sidebar-panel">
      {/* Panel Header */}
      <div className="dwr-roster-head">
        <div className="dwr-roster-head-row">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", margin: 0, color: "#14161A" }}>Employee Roster</h3>
            <span className="dwr-roster-count">{employeesSummary.length}</span>
          </div>
          {isMobile && selectedEmployeeId && (
            <button
              type="button"
              onClick={() => {
                setSelectedEmployeeId("");
                setMobileTab("reports");
              }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "11px",
                color: "#B42318",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Sticky Search Bar */}
        <div style={{ position: "relative" }}>
          <svg
            style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "#67707F", pointerEvents: "none" }}
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
              border: "1px solid #E7E9ED",
              fontSize: "11.5px",
              background: "#F9FAFB",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Scrollable Employee List */}
      <div className="dwr-roster-list">
        {/* All Employees Option */}
        <button
          type="button"
          onClick={() => {
            setSelectedEmployeeId("");
            if (isMobile) setMobileTab("reports");
          }}
          style={{
            textAlign: "left",
            padding: "8px 10px",
            borderRadius: "9px",
            border: "1px solid " + (selectedEmployeeId === "" ? "#C6D7F8" : "#E7E9ED"),
            background: selectedEmployeeId === "" ? "#EFF4FE" : "#FFFFFF",
            cursor: "pointer",
            transition: "all 0.12s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: "13px", color: selectedEmployeeId === "" ? "#1E4FBF" : "#3E434D" }}>
              All Employees
            </strong>
            <span
              style={{
                fontSize: "11px",
                background: selectedEmployeeId === "" ? "#2563EB" : "#F2F4F7",
                color: selectedEmployeeId === "" ? "#FFFFFF" : "#3E434D",
                padding: "1px 6px",
                borderRadius: "8px",
                fontWeight: "700",
              }}
            >
              {employeesSummary.reduce((acc, emp) => acc + (emp.totalReports || 0), 0)}
            </span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#67707F", marginTop: "2px" }}>
            Full organization records
          </div>
        </button>

        {loadingRoster ? (
          <div style={{ padding: "20px", textAlign: "center", fontSize: "11.5px", color: "#67707F" }}>
            Loading roster…
          </div>
        ) : filteredRoster.length === 0 ? (
          <div style={{ padding: "18px 10px", textAlign: "center", fontSize: "11px", color: "#67707F" }}>
            {searchQuery ? `No employees match "${searchQuery}"` : "No employees found"}
          </div>
        ) : (
          filteredRoster.map((emp) => {
            const active = selectedEmployeeId === emp.employeeId;
            const submittedToday = emp.lastReportDate === todayIso;
            return (
              <button
                key={emp.employeeId}
                type="button"
                onClick={() => {
                  setSelectedEmployeeId(emp.employeeId);
                  if (isMobile) setMobileTab("reports");
                }}
                style={{
                  textAlign: "left",
                  padding: "7px 10px",
                  borderRadius: "9px",
                  border: "1px solid " + (active ? "#C6D7F8" : "#E7E9ED"),
                  background: active ? "#EFF4FE" : "#FFFFFF",
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
                      fontSize: "13px",
                      color: active ? "#1E4FBF" : "#14161A",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: isMobile ? "240px" : "180px",
                    }}
                  >
                    {emp.name}
                  </strong>
                  <span
                    style={{
                      fontSize: "11px",
                      background: active ? "#2563EB" : "#F2F4F7",
                      color: active ? "#FFFFFF" : "#3E434D",
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", color: "#67707F" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? "220px" : "160px" }}>
                    {emp.employeeId} · {emp.department || "—"}
                  </span>
                  {submittedToday ? (
                    <span style={{ fontSize: "11px", fontWeight: "700", background: "#E9F6EF", color: "#3E434D", padding: "1px 5px", borderRadius: "4px" }}>
                      Today
                    </span>
                  ) : emp.lastReportDate ? (
                    <span style={{ fontSize: "11px", color: "#67707F" }}>
                      {emp.lastReportDate}
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", color: "#67707F" }}>
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
  );

  return (
    <div className="daily-reports-admin-workspace">
      {/* Portal export dropdown into top application navigation bar next to admin profile */}
      {topbarTarget && createPortal(exportDropdownContent, topbarTarget)}

      {/* Header Row: Report count and View Mode / Export Controls */}
      <div className="dwr-header-row">
        <div className="dwr-header-meta">
          <strong>{loadingReports ? "Syncing reports…" : `${totalSubmissions} report${totalSubmissions === 1 ? "" : "s"} in view`}</strong>
          <span>{selectedEmployeeObj ? `Filtered to ${selectedEmployeeObj.name}` : "Across the selected filters"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* View Mode Toggle: Cards vs Table */}
          <div style={{ display: "inline-flex", background: "#F9FAFB", padding: "2px", borderRadius: "8px", border: "1px solid #E7E9ED" }}>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              style={{
                border: "none",
                background: showCards ? "#2563EB" : "transparent",
                color: showCards ? "#FFFFFF" : "#67707F",
                fontWeight: showCards ? "700" : "500",
                fontSize: "11px",
                padding: "4px 9px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: showCards ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.12s ease",
              }}
            >
              <span>📑</span> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              style={{
                border: "none",
                background: !showCards ? "#2563EB" : "transparent",
                color: !showCards ? "#FFFFFF" : "#67707F",
                fontWeight: !showCards ? "700" : "500",
                fontSize: "11px",
                padding: "4px 9px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: !showCards ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.12s ease",
              }}
            >
              <span>▦</span> Table
            </button>
          </div>

          {/* Fallback inline export button if portal container not found */}
          {!topbarTarget && exportDropdownContent}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* KPI Metric Strip: Total, Today, Blockers, Staff Logged */}
      <div className="dwr-kpi-grid">
        <div className="dwr-kpi-card">
          <div className="dwr-kpi-icon" style={{ background: "#EFF4FE", color: "#2563EB" }}>
            📋
          </div>
          <div className="dwr-kpi-info">
            <span className="dwr-kpi-label">Total Reports</span>
            <span className="dwr-kpi-val">{totalSubmissions}</span>
          </div>
        </div>

        <div className="dwr-kpi-card">
          <div className="dwr-kpi-icon" style={{ background: "#EFF4FE", color: "#2563EB" }}>
            📅
          </div>
          <div className="dwr-kpi-info">
            <span className="dwr-kpi-label">Today</span>
            <span className="dwr-kpi-val">{todaySubmissions}</span>
          </div>
        </div>

        <div className="dwr-kpi-card" style={activeBlockersCount > 0 ? { borderColor: "#F5C6C1", background: "#FEF0EE" } : {}}>
          <div
            className="dwr-kpi-icon"
            style={{
              background: activeBlockersCount > 0 ? "#FEF0EE" : "#f1f3f4",
              color: activeBlockersCount > 0 ? "#B42318" : "#98A0AC",
            }}
          >
            ⚠️
          </div>
          <div className="dwr-kpi-info">
            <span className="dwr-kpi-label" style={{ color: activeBlockersCount > 0 ? "#B42318" : "#67707F" }}>
              Blockers
            </span>
            <span className="dwr-kpi-val" style={{ color: activeBlockersCount > 0 ? "#B42318" : "#14161A" }}>
              {activeBlockersCount}
            </span>
          </div>
        </div>

        <div className="dwr-kpi-card">
          <div className="dwr-kpi-icon" style={{ background: "#F9F5FF", color: "#6941C6" }}>
            👥
          </div>
          <div className="dwr-kpi-info">
            <span className="dwr-kpi-label">Staff Logged</span>
            <span className="dwr-kpi-val">{uniqueEmployeesInReports}</span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible only on mobile <= 860px) */}
      <div className="dwr-mobile-tabs">
        <button
          type="button"
          className={`dwr-mobile-tab-btn ${mobileTab === "reports" ? "active" : ""}`}
          onClick={() => setMobileTab("reports")}
        >
          <span>📋</span>
          <span>Reports ({reports.length})</span>
        </button>
        <button
          type="button"
          className={`dwr-mobile-tab-btn ${mobileTab === "roster" ? "active" : ""}`}
          onClick={() => setMobileTab("roster")}
        >
          <span>👥</span>
          <span>Team Roster ({employeesSummary.length})</span>
        </button>
      </div>

      {/* Main Layout: Split on desktop, switched on mobile */}
      <div className="dwr-main-layout">
        
        {/* Left Sidebar: Shown always on desktop, or when mobileTab === 'roster' on mobile */}
        {(!isMobile || mobileTab === "roster") && rosterContent}

        {/* Right Main Reports Workspace: Shown always on desktop, or when mobileTab === 'reports' on mobile */}
        {(!isMobile || mobileTab === "reports") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
            
            {/* Filter & Controls Card */}
            <div className="dwr-filter-card">
              
              {/* Top Row: Selected Employee Meta & Quick Switch */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <strong style={{ fontSize: "14.5px", color: "#3E434D", fontWeight: "700" }}>
                    {selectedEmployeeObj ? `${selectedEmployeeObj.name} (${selectedEmployeeObj.employeeId})` : "All Employees"}
                  </strong>

                  {/* Department Badge */}
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "#F9FAFB",
                      color: "#3E434D",
                      border: "1px solid #E7E9ED",
                    }}
                  >
                    {selectedEmployeeObj ? selectedEmployeeObj.department : "All Departments"}
                  </span>

                  {/* Filter action shortcut on mobile */}
                  {isMobile && !selectedEmployeeId && (
                    <button
                      type="button"
                      onClick={() => setMobileTab("roster")}
                      style={{
                        background: "#F9FAFB",
                        border: "1px solid #E7E9ED",
                        borderRadius: "6px",
                        color: "#3E434D",
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "2px 8px",
                        cursor: "pointer",
                      }}
                    >
                      👤 Select Employee
                    </button>
                  )}
                </div>

                <div style={{ fontSize: "12px", color: "#67707F", whiteSpace: "nowrap" }}>
                  {loadingReports ? "Syncing…" : `${reports.length} shown`}
                </div>
              </div>

              {/* Active Filter Chip Banner on Mobile if an employee is selected */}
              {selectedEmployeeId && (
                <div className="dwr-active-filter-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#3E434D" }}>FILTER:</span>
                    <span style={{ fontSize: "12px", color: "#3E434D", fontWeight: "600" }}>
                      {selectedEmployeeObj ? selectedEmployeeObj.name : selectedEmployeeId}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isMobile && (
                      <button
                        type="button"
                        onClick={() => setMobileTab("roster")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#3E434D",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Change
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedEmployeeId("")}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E7E9ED",
                        borderRadius: "5px",
                        padding: "2px 6px",
                        color: "#47505E",
                        fontSize: "11.5px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      ✕ Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: "1px", background: "#F9FAFB" }} />

              {/* Bottom Row: Date Range Filter Controls + Quick Presets + Clear Filters */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                
                {/* Date Inputs & Quick Presets Group */}
                <div className="dwr-date-inputs-group">
                  {/* From Date */}
                  <div className="dwr-date-input-wrap">
                    <span className="dwr-date-label">FROM</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="dwr-date-field"
                    />
                  </div>

                  {/* To Date */}
                  <div className="dwr-date-input-wrap">
                    <span className="dwr-date-label">TO</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="dwr-date-field"
                    />
                  </div>

                  {/* Quick Presets: Today, This Week, This Month */}
                  <div className="dwr-preset-chips">
                    <button
                      type="button"
                      onClick={applyPresetToday}
                      className={`dwr-preset-btn ${isTodayActive ? "active" : ""}`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={applyPresetThisWeek}
                      className={`dwr-preset-btn ${isWeekActive ? "active" : ""}`}
                    >
                      This Week
                    </button>
                    <button
                      type="button"
                      onClick={applyPresetThisMonth}
                      className={`dwr-preset-btn ${isMonthActive ? "active" : ""}`}
                    >
                      This Month
                    </button>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    style={{
                      fontSize: "11px",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: "1px solid #F5C6C1",
                      background: "#FEF0EE",
                      color: "#B42318",
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

            {/* Reports Display: Card View or Table View */}
            {loadingReports ? (
              <div className="card" style={{ padding: "50px 20px", textAlign: "center", fontSize: "13px", color: "#67707F", borderRadius: "14px" }}>
                Loading work reports…
              </div>
            ) : showCards ? (
              /* Mobile / Card View */
              <div className="dwr-card-list">
                {reports.length === 0 ? (
                  <div className="card" style={{ padding: "52px 24px", textAlign: "center", borderRadius: "14px", border: "1px dashed var(--line-strong, #D9DDE3)", background: "#FBFCFD" }}>
                    <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#EFF4FE", color: "#2563EB", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <strong style={{ fontSize: "14.5px", color: "#14161A" }}>No work reports found</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#67707F" }}>
                      No submissions match the current filter criteria.
                    </p>
                  </div>
                ) : (
                  reports.map((report) => <ReportCard key={report.id} report={report} />)
                )}
              </div>
            ) : (
              /* Desktop / Table View */
              <div
                className="card"
                style={{
                  padding: "0",
                  borderRadius: "14px",
                  border: "1px solid #F9FAFB",
                  overflow: "hidden",
                }}
              >
                <div className="table-wrap" style={{ overflowX: "auto" }}>
                  <table
                    className="dwr-table"
                    style={{
                      width: "100%",
                      minWidth: "960px",
                      tableLayout: "fixed",
                      borderCollapse: "collapse",
                      fontSize: "12px",
                    }}
                  >
                    <colgroup>
                      <col style={{ width: "95px" }} />
                      <col style={{ width: "150px" }} />
                      <col style={{ width: "36%" }} />
                      <col style={{ width: "24%" }} />
                      <col style={{ width: "160px" }} />
                      <col style={{ width: "110px" }} />
                      <col style={{ width: "115px" }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #F9FAFB" }}>
                        <th style={{ fontSize: "11px", fontWeight: "700", color: "#47505E", padding: "11px 12px", textAlign: "left" }}>Date</th>
                        <th style={{ fontSize: "11px", fontWeight: "700", color: "#47505E", padding: "11px 12px", textAlign: "left" }}>Employee</th>
                        <th style={{ fontSize: "11px", fontWeight: "700", color: "#47505E", padding: "11px 12px", textAlign: "left" }}>Tasks Completed & Learnings</th>
                        <th style={{ fontSize: "11px", fontWeight: "700", color: "#47505E", padding: "11px 12px", textAlign: "left" }}>Blockers / Issues</th>
                        <th style={{ fontSize: "11px", fontWeight: "700", color: "#47505E", padding: "11px 12px", textAlign: "left" }}>Plan for Tomorrow</th>
                        <th style={{ fontSize: "11px", fontWeight: "700", color: "#47505E", padding: "11px 12px", textAlign: "left" }}>Equipment Used</th>
                        <th style={{ fontSize: "11px", fontWeight: "700", color: "#47505E", padding: "11px 12px", textAlign: "left" }}>Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((r) => {
                        const emp = r.employee || {};
                        const hasBlocker = checkHasBlocker(r.blockers);
                        return (
                          <tr
                            key={r.id}
                            style={{
                              borderBottom: "1px solid #F9FAFB",
                              verticalAlign: "top",
                              transition: "background 0.12s ease",
                            }}
                          >
                            {/* Date */}
                            <td style={{ fontSize: "13px", fontWeight: "600", color: "#14161A", padding: "12px", whiteSpace: "nowrap" }}>
                              {r.reportDate}
                            </td>

                            {/* Employee */}
                            <td style={{ padding: "12px" }}>
                              <strong style={{ fontSize: "13px", color: "#14161A", display: "block", wordBreak: "break-word" }}>
                                {emp.name || "—"}
                              </strong>
                              <div style={{ fontSize: "11.5px", color: "#67707F", marginTop: "2px", wordBreak: "break-word" }}>
                                {emp.employeeId || "—"} · {emp.department || "—"}
                              </div>
                            </td>

                            {/* Tasks Completed & Learnings */}
                            <td style={{ padding: "12px" }}>
                              <ExpandableText text={r.tasksCompleted} maxLines={3} maxChars={140} />
                            </td>

                            {/* Blockers / Issues */}
                            <td style={{ padding: "12px", color: hasBlocker ? "#B42318" : "#14161A" }}>
                              {hasBlocker && (
                                <div style={{ marginBottom: "4px" }}>
                                  <span
                                    style={{
                                      background: "#FEF0EE",
                                      color: "#B42318",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      fontSize: "11px",
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
                            <td style={{ fontSize: "11.5px", color: "#14161A", padding: "12px", wordBreak: "break-word" }}>
                              {r.equipmentsUsed && r.equipmentsUsed.trim() ? r.equipmentsUsed : <span style={{ color: "#67707F" }}>N/A</span>}
                            </td>

                            {/* Submitted At */}
                            <td style={{ fontSize: "11px", color: "#67707F", padding: "12px", whiteSpace: "nowrap" }}>
                              {r.createdAt ? istDateTime(r.createdAt) : "—"}
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
                                  background: "#F9FAFB",
                                  display: "grid",
                                  placeItems: "center",
                                  color: "#3E434D",
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
                              <strong style={{ fontSize: "14px", color: "#3E434D", fontWeight: "700" }}>
                                No work reports found for the selected criteria
                              </strong>
                              <p style={{ margin: 0, fontSize: "12px", color: "#67707F", lineHeight: "1.5" }}>
                                No daily work submissions match the current employee or date filters. Try selecting a different employee or expanding your date range.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

