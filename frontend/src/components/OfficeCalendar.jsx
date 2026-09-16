import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_OF_WEEK_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Palette exactly matching the reference screenshot
const THEME = {
  weekend: {
    bg: "#489ae9",
    text: "#ffffff",
    dot: "#489ae9",
    label: "Weekend",
  },
  holiday: {
    bg: "#509e6c",
    text: "#ffffff",
    dot: "#509e6c",
    label: "Organization Holiday",
  },
  leave: {
    bg: "#e24b70", // Pink/Rose as in screenshot "mathesh"
    text: "#ffffff",
    dot: "#e24b70",
    label: "Approved Leave",
  },
  wfh: {
    bg: "#c6d747", // Olive/Yellow-green as in screenshot "Vishal"
    text: "#1e2908",
    dot: "#c6d747",
    label: "Approved WFH",
  },
};

function formatIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function OfficeCalendar() {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calendarData, setCalendarData] = useState({
    workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    holidays: [],
    leaves: [],
  });

  // Selected event popover state
  const [selectedEvent, setSelectedEvent] = useState(null);
  // Manage Holidays drawer state
  const [holidayDrawerOpen, setHolidayDrawerOpen] = useState(false);
  // Search query for highlighting
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Fetch month data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.officeCalendar(currentYear, currentMonth);
      if (data) {
        setCalendarData({
          workingDays: Array.isArray(data.workingDays) ? data.workingDays : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
          holidays: Array.isArray(data.holidays) ? data.holidays : [],
          leaves: Array.isArray(data.leaves) ? data.leaves : [],
        });
      }
    } catch (err) {
      try {
        const [hols, allLvs, settings] = await Promise.all([
          api.holidays(currentYear, true),
          api.allLeaves(),
          api.systemSettings().catch(() => ({})),
        ]);
        const wDays = (settings?.WORKING_DAYS || "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(",");
        const approvedLeaves = (Array.isArray(allLvs) ? allLvs : []).filter(l => l.status === "APPROVED");
        setCalendarData({
          workingDays: wDays,
          holidays: Array.isArray(hols) ? hols : [],
          leaves: approvedLeaves,
        });
      } catch (fallbackErr) {
        setError(err.message || fallbackErr.message || "Failed to load office calendar data");
      }
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Navigation handlers
  function prevMonth() {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  }

  // Generate weeks (each week has 7 days, Sunday=col 1, Saturday=col 7)
  const weeks = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

    const allDays = [];

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYearNum = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateObj = new Date(prevYearNum, prevMonthNum - 1, d);
      allDays.push({
        dateObj,
        dayNumber: d,
        isoDate: formatIso(dateObj),
        dayOfWeek: dateObj.getDay(), // 0-6
        dayOfWeekName: DAY_OF_WEEK_NAMES[dateObj.getDay()],
        isCurrentMonth: false,
        monthName: d === 1 ? SHORT_MONTH_NAMES[prevMonthNum - 1] : null,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth - 1, d);
      allDays.push({
        dateObj,
        dayNumber: d,
        isoDate: formatIso(dateObj),
        dayOfWeek: dateObj.getDay(),
        dayOfWeekName: DAY_OF_WEEK_NAMES[dateObj.getDay()],
        isCurrentMonth: true,
        monthName: d === 1 ? SHORT_MONTH_NAMES[currentMonth - 1] : null,
      });
    }

    // Next month padding days to complete full 5 or 6 weeks
    const totalSlots = allDays.length <= 35 ? 35 : 42;
    const remainingSlots = totalSlots - allDays.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextMonthNum = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYearNum = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateObj = new Date(nextYearNum, nextMonthNum - 1, d);
      allDays.push({
        dateObj,
        dayNumber: d,
        isoDate: formatIso(dateObj),
        dayOfWeek: dateObj.getDay(),
        dayOfWeekName: DAY_OF_WEEK_NAMES[dateObj.getDay()],
        isCurrentMonth: false,
        monthName: d === 1 ? SHORT_MONTH_NAMES[nextMonthNum - 1] : null,
      });
    }

    // Split into arrays of 7 days (weeks)
    const weekChunks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weekChunks.push(allDays.slice(i, i + 7));
    }
    return weekChunks;
  }, [currentYear, currentMonth]);

  // Compute multi-day spans and single-day events for each week row
  const weekEvents = useMemo(() => {
    return weeks.map((week) => {
      const weekStartIso = week[0].isoDate;
      const weekEndIso = week[6].isoDate;
      const items = [];

      // 1. Weekend bars for non-working days in this week
      week.forEach((day, dayIndex) => {
        const isWorking = calendarData.workingDays.includes(day.dayOfWeekName);
        if (!isWorking) {
          items.push({
            id: `weekend-${day.isoDate}`,
            category: "weekend",
            title: "Weekend",
            subtitle: "Non-working day",
            startCol: dayIndex + 1,
            endCol: dayIndex + 1,
            date: day.isoDate,
            raw: null,
          });
        }
      });

      // 2. Organization Holidays in this week
      calendarData.holidays.forEach((h) => {
        if (h.holidayDate >= weekStartIso && h.holidayDate <= weekEndIso) {
          const dayIndex = week.findIndex((d) => d.isoDate === h.holidayDate);
          if (dayIndex !== -1) {
            items.push({
              id: `holiday-${h.id || h.name}-${h.holidayDate}`,
              category: "holiday",
              title: h.name,
              subtitle: h.type || "ORGANIZATION HOLIDAY",
              description: h.description,
              startCol: dayIndex + 1,
              endCol: dayIndex + 1,
              date: h.holidayDate,
              raw: h,
            });
          }
        }
      });

      // 3. Approved Leaves & WFH (Multi-day continuous spanning across days in this week)
      calendarData.leaves.forEach((l) => {
        if (!l.startDate || !l.endDate) return;
        // Check if leave overlaps this week
        if (l.startDate <= weekEndIso && l.endDate >= weekStartIso) {
          // Clamp start and end to this week's bounds (Sunday=0 to Saturday=6)
          let startIdx = 0;
          let endIdx = 6;

          for (let i = 0; i < 7; i++) {
            if (week[i].isoDate === l.startDate) startIdx = i;
            if (week[i].isoDate === l.endDate) endIdx = i;
          }
          if (l.startDate > weekStartIso) {
            const foundStart = week.findIndex((d) => d.isoDate === l.startDate);
            if (foundStart !== -1) startIdx = foundStart;
          }
          if (l.endDate < weekEndIso) {
            const foundEnd = week.findIndex((d) => d.isoDate === l.endDate);
            if (foundEnd !== -1) endIdx = foundEnd;
          }

          const isWfh = l.leaveType === "WORK_FROM_HOME";
          const empName = l.employee?.name || "Employee";

          items.push({
            id: `leave-${l.id}-${weekStartIso}`,
            category: isWfh ? "wfh" : "leave",
            title: empName,
            subtitle: isWfh ? "Work From Home" : (l.leaveType ? l.leaveType.replace(/_/g, " ") : "Approved Leave"),
            employee: l.employee,
            leaveType: l.leaveType,
            startDate: l.startDate,
            endDate: l.endDate,
            workingDays: l.workingDays,
            reason: l.reason,
            startCol: startIdx + 1,
            endCol: endIdx + 1,
            raw: l,
          });
        }
      });

      // Assign non-overlapping visual lanes/slots for overlapping events
      items.sort((a, b) => {
        // Multi-day events first, then by start column
        const aSpan = a.endCol - a.startCol;
        const bSpan = b.endCol - b.startCol;
        if (bSpan !== aSpan) return bSpan - aSpan;
        return a.startCol - b.startCol;
      });

      const lanes = [];
      items.forEach((item) => {
        let placed = false;
        for (let l = 0; l < lanes.length; l++) {
          const hasOverlap = lanes[l].some(
            (other) => Math.max(item.startCol, other.startCol) <= Math.min(item.endCol, other.endCol)
          );
          if (!hasOverlap) {
            lanes[l].push(item);
            item.laneIndex = l;
            placed = true;
            break;
          }
        }
        if (!placed) {
          item.laneIndex = lanes.length;
          lanes.push([item]);
        }
      });

      return {
        week,
        items,
        totalLanes: Math.max(lanes.length, 1),
      };
    });
  }, [weeks, calendarData]);

  const todayIso = formatIso(today);

  return (
    <div
      className="office-calendar-dark-container"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        background: "#121315",
        color: "#e8eaed",
        padding: "16px",
        borderRadius: "16px",
        minHeight: "calc(100vh - 120px)",
        boxSizing: "border-box",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Application Bar (Exact match to screenshot header) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          padding: "4px 8px 10px",
        }}
      >
        {/* Left Controls: Today Pill + Navigation + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Today Button */}
          <button
            type="button"
            onClick={goToToday}
            style={{
              border: "1px solid #3c4043",
              background: "transparent",
              color: "#e8eaed",
              padding: "7px 18px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#202124")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Today
          </button>

          {/* Prev / Next Chevrons */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              type="button"
              onClick={prevMonth}
              title="Previous month"
              style={{
                background: "transparent",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "grid",
                placeItems: "center",
                color: "#e8eaed",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "700",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#202124")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={nextMonth}
              title="Next month"
              style={{
                background: "transparent",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "grid",
                placeItems: "center",
                color: "#e8eaed",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "700",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#202124")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              ›
            </button>
          </div>

          {/* Month Year Title */}
          <h2 style={{ fontSize: "21px", fontWeight: "600", color: "#ffffff", margin: 0, letterSpacing: "-0.01em" }}>
            {FULL_MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
        </div>

        {/* Right Toolbar: Search + Settings + View Toggle + Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Quick Filter Search Bar */}
          {searchOpen ? (
            <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
              <input
                type="text"
                autoFocus
                placeholder="Search person or holiday..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "#202124",
                  border: "1px solid #3c4043",
                  color: "#fff",
                  padding: "6px 28px 6px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  outline: "none",
                  width: "180px",
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                style={{
                  position: "absolute",
                  right: "8px",
                  background: "none",
                  border: "none",
                  color: "#9aa0a6",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              title="Search events"
              style={{
                background: "transparent",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "grid",
                placeItems: "center",
                color: "#9aa0a6",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#202124")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={() => api.downloadHolidayReportCsv(currentYear)}
            title="Export holiday schedule as CSV"
            style={{
              background: "transparent",
              border: "1px solid #3c4043",
              color: "#c4c7c5",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#202124")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span>📥 Export CSV</span>
          </button>

          {/* Manage Holidays Button */}
          <button
            type="button"
            onClick={() => setHolidayDrawerOpen(true)}
            style={{
              background: "#1f3b2e",
              border: "1px solid #2f5c47",
              color: "#7ee4aa",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#28513f")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1f3b2e")}
          >
            + Manage Holidays
          </button>

          {/* Month Pill Dropdown */}
          <div
            style={{
              border: "1px solid #3c4043",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "13px",
              color: "#e8eaed",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#1a1b1e",
            }}
          >
            <span>Month</span>
            <span style={{ fontSize: "10px", color: "#9aa0a6" }}>▾</span>
          </div>

          {/* Active Calendar View Icon (Blue Filled) */}
          <div
            title="Calendar grid active"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#0064d2",
              display: "grid",
              placeItems: "center",
              color: "#ffffff",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: "#381c1c", border: "1px solid #7d2a2a", color: "#fca5a5", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px" }}>
          {error}
        </div>
      )}

      {/* Month Calendar Grid (Outer Border Frame matching screenshot) */}
      <div
        style={{
          borderRadius: "14px",
          border: "1px solid #282a2d",
          overflow: "hidden",
          background: "#16171a",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Render Weeks */}
        {weekEvents.map((weekObj, weekIdx) => {
          const isFirstWeek = weekIdx === 0;
          return (
            <div
              key={`week-${weekIdx}`}
              style={{
                position: "relative",
                minHeight: isFirstWeek ? "130px" : "118px",
                borderBottom: weekIdx === weekEvents.length - 1 ? "none" : "1px solid #26282b",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* 7 Column Background Slot Lines & Date Headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                }}
              >
                {weekObj.week.map((day, dIdx) => {
                  const isCurrent = day.isCurrentMonth;
                  const isToday = day.isoDate === todayIso;
                  return (
                    <div
                      key={day.isoDate}
                      style={{
                        borderRight: dIdx === 6 ? "none" : "1px solid #26282b",
                        padding: "8px 4px 4px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        background: isToday ? "#1b2128" : "transparent",
                      }}
                    >
                      {/* Day Name Header (Only displayed in top week row) */}
                      {isFirstWeek && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#9aa0a6",
                            letterSpacing: "0.06em",
                            marginBottom: "3px",
                          }}
                        >
                          {DAY_NAMES[dIdx]}
                        </span>
                      )}

                      {/* Date Number / Month Tag (e.g. "29", "1 Dec", "1 Jan") */}
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: isToday ? "700" : isCurrent ? "500" : "400",
                          color: isToday
                            ? "#ffffff"
                            : isCurrent
                            ? "#e8eaed"
                            : "#606469",
                          background: isToday ? "#1a73e8" : "transparent",
                          borderRadius: isToday ? "50%" : "0",
                          width: isToday ? "24px" : "auto",
                          height: isToday ? "24px" : "auto",
                          display: "grid",
                          placeItems: "center",
                          lineHeight: "1",
                        }}
                      >
                        {day.monthName ? `${day.dayNumber} ${day.monthName}` : day.dayNumber}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Foreground Events Layer (Positioned below the date header row) */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  paddingTop: isFirstWeek ? "48px" : "30px",
                  paddingBottom: "8px",
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gridAutoRows: "24px",
                  rowGap: "5px",
                  width: "100%",
                }}
              >
                {weekObj.items.map((evt) => {
                  const theme = THEME[evt.category] || THEME.weekend;
                  const isMatched =
                    !searchQuery ||
                    evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (evt.subtitle && evt.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      style={{
                        gridColumn: `${evt.startCol} / ${evt.endCol + 1}`,
                        gridRow: evt.laneIndex + 1,
                        background: theme.bg,
                        color: theme.text,
                        borderRadius: "5px",
                        margin: "0 4px",
                        padding: "0 10px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "11px",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        cursor: "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        opacity: isMatched ? 1 : 0.25,
                        transition: "transform 0.1s ease, filter 0.1s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.12)")}
                      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
                      title={`${evt.title} (${evt.subtitle})`}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {evt.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Color Legend (Matches screenshot reference) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "24px",
          padding: "6px 10px",
          fontSize: "12px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "11px", color: "#9aa0a6", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Legend
        </span>

        {/* Weekend */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "13px", height: "13px", borderRadius: "3px", background: THEME.weekend.bg }} />
          <span style={{ color: "#d2d5d8" }}>Weekend</span>
        </div>

        {/* Approved Leave */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "13px", height: "13px", borderRadius: "3px", background: THEME.leave.bg }} />
          <span style={{ color: "#d2d5d8" }}>Approved Leave</span>
        </div>

        {/* Approved WFH */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "13px", height: "13px", borderRadius: "3px", background: THEME.wfh.bg }} />
          <span style={{ color: "#d2d5d8" }}>Approved WFH</span>
        </div>

        {/* Organization Holiday */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "13px", height: "13px", borderRadius: "3px", background: THEME.holiday.bg }} />
          <span style={{ color: "#d2d5d8" }}>Organization Holiday</span>
        </div>
      </div>

      {/* Event Details Popover Modal */}
      {selectedEvent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1200,
            display: "grid",
            placeItems: "center",
            padding: "16px",
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "20px",
              borderRadius: "14px",
              background: "#1e1f23",
              color: "#e8eaed",
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
              border: "1px solid #33363b",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: (THEME[selectedEvent.category] || THEME.weekend).bg,
                  }}
                />
                <h3 style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  color: "#9aa0a6",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Badge */}
            <div style={{ marginBottom: "14px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "5px",
                  background: (THEME[selectedEvent.category] || THEME.weekend).bg,
                  color: (THEME[selectedEvent.category] || THEME.weekend).text,
                }}
              >
                {selectedEvent.subtitle}
              </span>
            </div>

            {/* Detail Rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
              {selectedEvent.employee && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #2c2f35", paddingBottom: "8px" }}>
                  <span style={{ color: "#9aa0a6" }}>Employee ID</span>
                  <span style={{ color: "#ffffff", fontWeight: "600" }}>
                    {selectedEvent.employee.employeeId || "—"}
                  </span>
                </div>
              )}

              {selectedEvent.employee?.department && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #2c2f35", paddingBottom: "8px" }}>
                  <span style={{ color: "#9aa0a6" }}>Department</span>
                  <span style={{ color: "#ffffff", fontWeight: "600" }}>{selectedEvent.employee.department}</span>
                </div>
              )}

              {selectedEvent.startDate && selectedEvent.endDate && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #2c2f35", paddingBottom: "8px" }}>
                  <span style={{ color: "#9aa0a6" }}>Date Range</span>
                  <span style={{ color: "#ffffff", fontWeight: "600" }}>
                    {selectedEvent.startDate} → {selectedEvent.endDate} ({selectedEvent.workingDays || 1}d)
                  </span>
                </div>
              )}

              {selectedEvent.date && !selectedEvent.startDate && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #2c2f35", paddingBottom: "8px" }}>
                  <span style={{ color: "#9aa0a6" }}>Date</span>
                  <span style={{ color: "#ffffff", fontWeight: "600" }}>{selectedEvent.date}</span>
                </div>
              )}

              {selectedEvent.reason && (
                <div style={{ borderBottom: "1px solid #2c2f35", paddingBottom: "8px" }}>
                  <span style={{ color: "#9aa0a6", display: "block", marginBottom: "4px" }}>Reason</span>
                  <p style={{ margin: 0, color: "#e8eaed", background: "#151619", padding: "8px", borderRadius: "6px", fontSize: "12px", lineHeight: "1.45" }}>
                    {selectedEvent.reason}
                  </p>
                </div>
              )}

              {selectedEvent.description && (
                <div style={{ borderBottom: "1px solid #2c2f35", paddingBottom: "8px" }}>
                  <span style={{ color: "#9aa0a6", display: "block", marginBottom: "4px" }}>Description</span>
                  <p style={{ margin: 0, color: "#e8eaed", background: "#151619", padding: "8px", borderRadius: "6px", fontSize: "12px", lineHeight: "1.45" }}>
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: "#2a2d32",
                  border: "1px solid #3c4045",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Holidays Drawer Modal */}
      {holidayDrawerOpen && (
        <HolidayManagerModal
          year={currentYear}
          onClose={() => setHolidayDrawerOpen(false)}
          onUpdate={() => loadData()}
        />
      )}
    </div>
  );
}

// ── Dark-Themed Holiday Management Drawer Modal ──────────────────────────────

function HolidayManagerModal({ year, onClose, onUpdate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  const blankForm = {
    name: "",
    holidayDate: `${year}-01-01`,
    description: "",
    type: "PUBLIC",
    recurring: false,
    active: true,
  };

  const [form, setForm] = useState(blankForm);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.holidays(year, true);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load holidays");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.updateHoliday(editingId, form);
      } else {
        await api.createHoliday(form);
      }
      setEditingId(null);
      setForm(blankForm);
      loadHolidays();
      onUpdate?.();
    } catch (err) {
      setError(err.message || "Failed to save holiday");
    }
  }

  function startEdit(h) {
    setEditingId(h.id);
    setForm({
      name: h.name,
      holidayDate: h.holidayDate,
      description: h.description || "",
      type: h.type || "PUBLIC",
      recurring: Boolean(h.recurring),
      active: Boolean(h.active),
    });
  }

  async function handleToggleActive(h) {
    try {
      await api.setHolidayActive(h.id, !h.active);
      loadHolidays();
      onUpdate?.();
    } catch (err) {
      setError(err.message || "Failed to update holiday status");
    }
  }

  async function handleDelete(h) {
    if (!window.confirm(`Delete holiday "${h.name}"?`)) return;
    try {
      await api.deleteHoliday(h.id);
      loadHolidays();
      onUpdate?.();
    } catch (err) {
      setError(err.message || "Failed to delete holiday");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1300,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          height: "100%",
          background: "#18191c",
          color: "#e8eaed",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
          borderLeft: "1px solid #2d3035",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #282a2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#18191c",
            zIndex: 10,
          }}
        >
          <div>
            <span style={{ fontSize: "10.5px", letterSpacing: "0.08em", fontWeight: "700", color: "#509e6c", textTransform: "uppercase" }}>
              GOVERNANCE
            </span>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff", margin: "2px 0 0" }}>
              Manage {year} Holidays
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#282a2e",
              border: "none",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              fontSize: "16px",
              color: "#c4c7c5",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ margin: "14px 24px 0", background: "#3a1b1b", border: "1px solid #7d2a2a", color: "#fca5a5", padding: "10px", borderRadius: "8px", fontSize: "12px" }}>
            {error}
          </div>
        )}

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Add / Edit Form */}
          <form
            onSubmit={handleSave}
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #2d3035",
              background: "#1e2024",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                {editingId ? "Edit Holiday" : "Add New Holiday"}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(blankForm);
                  }}
                  style={{ background: "none", border: "none", color: "#9aa0a6", fontSize: "11px", cursor: "pointer" }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#9aa0a6", display: "block", marginBottom: "4px" }}>
                  Holiday Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Christmas"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid #3c4045", background: "#121315", color: "#fff", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#9aa0a6", display: "block", marginBottom: "4px" }}>
                  Date *
                </label>
                <input
                  required
                  type="date"
                  value={form.holidayDate}
                  onChange={(e) => setForm({ ...form, holidayDate: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid #3c4045", background: "#121315", color: "#fff", fontSize: "12px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "#9aa0a6", display: "block", marginBottom: "4px" }}>
                  Holiday Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid #3c4045", background: "#121315", color: "#fff", fontSize: "12px" }}
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="ORGANIZATION">ORGANIZATION</option>
                  <option value="OPTIONAL">OPTIONAL</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "11px", color: "#9aa0a6", display: "block", marginBottom: "4px" }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid #3c4045", background: "#121315", color: "#fff", fontSize: "12px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#c4c7c5", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                />
                Recurring Holiday (Annual)
              </label>

              <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#c4c7c5", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active
              </label>

              <button
                type="submit"
                style={{
                  marginLeft: "auto",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  background: "#509e6c",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {editingId ? "Update Holiday" : "Save Holiday"}
              </button>
            </div>
          </form>

          {/* List of Holidays */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", margin: "0 0 4px" }}>
              Holidays for {year} ({items.length})
            </h3>

            {loading ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#9aa0a6", fontSize: "12px" }}>
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", background: "#1f2125", borderRadius: "8px", color: "#9aa0a6", fontSize: "12px" }}>
                No holidays found for {year}.
              </div>
            ) : (
              items.map((h) => (
                <div
                  key={h.id || h.name}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #2c2f34",
                    background: "#1e2024",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    opacity: h.active ? 1 : 0.5,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "13px", color: "#ffffff" }}>{h.name}</strong>
                      <span style={{ fontSize: "9.5px", fontWeight: "700", padding: "1px 5px", borderRadius: "4px", background: "#273a2f", color: "#509e6c" }}>
                        {h.type}
                      </span>
                      {h.recurring && (
                        <span style={{ fontSize: "9.5px", color: "#489ae9" }}>
                          Recurring
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "11px", color: "#9aa0a6", marginTop: "2px" }}>
                      {h.holidayDate} {h.description ? `· ${h.description}` : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => startEdit(h)}
                      style={{
                        background: "#2b2e34",
                        border: "1px solid #3d4149",
                        color: "#e8eaed",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(h)}
                      style={{
                        background: "#2b2e34",
                        border: "1px solid #3d4149",
                        color: "#e8eaed",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      {h.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(h)}
                      style={{
                        background: "#421818",
                        border: "1px solid #732626",
                        color: "#ff8b8b",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
