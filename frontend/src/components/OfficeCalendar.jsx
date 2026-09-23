import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_OF_WEEK_NAMES = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const THEME = {
  weekend: { bg: "#3B82F6", text: "#FFFFFF", dot: "#3B82F6" },
  leave: { bg: "#12B76A", text: "#FFFFFF", dot: "#12B76A" },
  wfh: { bg: "#E11D48", text: "#FFFFFF", dot: "#E11D48" },
  holiday: { bg: "#F59E0B", text: "#FFFFFF", dot: "#F59E0B" },
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

  const [selectedEvent, setSelectedEvent] = useState(null);

  const [holidayDrawerOpen, setHolidayDrawerOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.officeCalendar(currentYear, currentMonth);
      if (data) {
        setCalendarData({
          workingDays: Array.isArray(data.workingDays)
            ? data.workingDays
            : ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
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
        const wDays = (
          settings?.WORKING_DAYS || "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"
        ).split(",");
        const approvedLeaves = (Array.isArray(allLvs) ? allLvs : []).filter(
          (l) => l.status === "APPROVED",
        );
        setCalendarData({
          workingDays: wDays,
          holidays: Array.isArray(hols) ? hols : [],
          leaves: approvedLeaves,
        });
      } catch (fallbackErr) {
        setError(
          err.message ||
            fallbackErr.message ||
            "Failed to load office calendar data",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const weeks = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(
      currentYear,
      currentMonth - 1,
      0,
    ).getDate();

    const allDays = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYearNum = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateObj = new Date(prevYearNum, prevMonthNum - 1, d);
      allDays.push({
        dateObj,
        dayNumber: d,
        isoDate: formatIso(dateObj),
        dayOfWeek: dateObj.getDay(),
        dayOfWeekName: DAY_OF_WEEK_NAMES[dateObj.getDay()],
        isCurrentMonth: false,
        monthName: d === 1 ? SHORT_MONTH_NAMES[prevMonthNum - 1] : null,
      });
    }

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

    const weekChunks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weekChunks.push(allDays.slice(i, i + 7));
    }
    return weekChunks;
  }, [currentYear, currentMonth]);

  const weekEvents = useMemo(() => {
    return weeks.map((week) => {
      const weekStartIso = week[0].isoDate;
      const weekEndIso = week[6].isoDate;
      const items = [];

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

      calendarData.leaves.forEach((l) => {
        if (!l.startDate || !l.endDate) return;

        if (l.startDate <= weekEndIso && l.endDate >= weekStartIso) {
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
            subtitle: isWfh
              ? "Work From Home"
              : l.leaveType
                ? l.leaveType.replace(/_/g, " ")
                : "Approved Leave",
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

      items.sort((a, b) => {
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
            (other) =>
              Math.max(item.startCol, other.startCol) <=
              Math.min(item.endCol, other.endCol),
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
        background: "#FFFFFF",
        color: "#14161A",
        padding: "16px",
        borderRadius: "16px",
        minHeight: "calc(100vh - 120px)",
        boxSizing: "border-box",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
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
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            type="button"
            onClick={goToToday}
            style={{
              border: "1px solid #D9DDE3",
              background: "transparent",
              color: "#14161A",
              padding: "7px 18px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F7FA")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Today
          </button>

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
                color: "#14161A",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "700",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#F5F7FA")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
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
                color: "#14161A",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "700",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#F5F7FA")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              ›
            </button>
          </div>

          <h2
            style={{
              fontSize: "21px",
              fontWeight: "600",
              color: "#14161A",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {FULL_MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {searchOpen ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                position: "relative",
              }}
            >
              <input
                type="text"
                autoFocus
                placeholder="Search person or holiday..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "#F5F7FA",
                  border: "1px solid #D9DDE3",
                  color: "#14161A",
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
                  color: "#67707F",
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
                color: "#67707F",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#F5F7FA")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <svg
                width="18"
                height="18"
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
            </button>
          )}

          <button
            type="button"
            onClick={() => api.downloadHolidayReportCsv(currentYear)}
            title="Export holiday schedule as CSV"
            style={{
              background: "transparent",
              border: "1px solid #D9DDE3",
              color: "#47505E",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F7FA")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span>📥 Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setHolidayDrawerOpen(true)}
            style={{
              background: "#EFF4FE",
              border: "1px solid #C6D7F8",
              color: "#1E4FBF",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#DBEAFE")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#EFF4FE")}
          >
            + Manage Holidays
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#FEF0EE",
            border: "1px solid #F5C6C1",
            color: "#B42318",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "12.5px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          borderRadius: "14px",
          border: "1px solid #E7E9ED",
          overflow: "hidden",
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {weekEvents.map((weekObj, weekIdx) => {
          const isFirstWeek = weekIdx === 0;
          return (
            <div
              key={`week-${weekIdx}`}
              style={{
                position: "relative",
                minHeight: isFirstWeek ? "130px" : "118px",
                borderBottom:
                  weekIdx === weekEvents.length - 1
                    ? "none"
                    : "1px solid #F2F4F7",
                display: "flex",
                flexDirection: "column",
              }}
            >
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
                        borderRight: dIdx === 6 ? "none" : "1px solid #F2F4F7",
                        padding: "8px 4px 4px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        background: isToday ? "#EFF4FE" : "transparent",
                      }}
                    >
                      {isFirstWeek && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#67707F",
                            letterSpacing: "0.06em",
                            marginBottom: "3px",
                          }}
                        >
                          {DAY_NAMES[dIdx]}
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: isToday
                            ? "700"
                            : isCurrent
                              ? "500"
                              : "400",
                          color: isToday
                            ? "#FFFFFF"
                            : isCurrent
                              ? "#14161A"
                              : "#98A0AC",
                          background: isToday ? "#2563EB" : "transparent",
                          borderRadius: isToday ? "50%" : "0",
                          width: isToday ? "24px" : "auto",
                          height: isToday ? "24px" : "auto",
                          display: "grid",
                          placeItems: "center",
                          lineHeight: "1",
                        }}
                      >
                        {day.monthName
                          ? `${day.dayNumber} ${day.monthName}`
                          : day.dayNumber}
                      </span>
                    </div>
                  );
                })}
              </div>

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
                    evt.title
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    (evt.subtitle &&
                      evt.subtitle
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()));

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
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.filter = "brightness(1.12)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.filter = "none")
                      }
                      title={`${evt.title} (${evt.subtitle})`}
                    >
                      <span
                        style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                      >
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
        <span
          style={{
            fontSize: "11px",
            color: "#67707F",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Legend
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "13px",
              height: "13px",
              borderRadius: "3px",
              background: THEME.weekend.bg,
            }}
          />
          <span style={{ color: "#47505E" }}>Weekend</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "13px",
              height: "13px",
              borderRadius: "3px",
              background: THEME.leave.bg,
            }}
          />
          <span style={{ color: "#47505E" }}>Approved Leave</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "13px",
              height: "13px",
              borderRadius: "3px",
              background: THEME.wfh.bg,
            }}
          />
          <span style={{ color: "#47505E" }}>Approved WFH</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "13px",
              height: "13px",
              borderRadius: "3px",
              background: THEME.holiday.bg,
            }}
          />
          <span style={{ color: "#47505E" }}>Organization Holiday</span>
        </div>
      </div>

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
              background: "#FFFFFF",
              color: "#14161A",
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
              border: "1px solid #E7E9ED",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "12px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "9px" }}
              >
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: (THEME[selectedEvent.category] || THEME.weekend)
                      .bg,
                  }}
                />
                <h3
                  style={{
                    fontSize: "17px",
                    fontWeight: "700",
                    color: "#14161A",
                    margin: 0,
                  }}
                >
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
                  color: "#67707F",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "5px",
                  background: (THEME[selectedEvent.category] || THEME.weekend)
                    .bg,
                  color: (THEME[selectedEvent.category] || THEME.weekend).text,
                }}
              >
                {selectedEvent.subtitle}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "13px",
              }}
            >
              {selectedEvent.employee && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #E7E9ED",
                    paddingBottom: "8px",
                  }}
                >
                  <span style={{ color: "#67707F" }}>Employee ID</span>
                  <span style={{ color: "#14161A", fontWeight: "600" }}>
                    {selectedEvent.employee.employeeId || "—"}
                  </span>
                </div>
              )}

              {selectedEvent.employee?.department && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #E7E9ED",
                    paddingBottom: "8px",
                  }}
                >
                  <span style={{ color: "#67707F" }}>Department</span>
                  <span style={{ color: "#14161A", fontWeight: "600" }}>
                    {selectedEvent.employee.department}
                  </span>
                </div>
              )}

              {selectedEvent.startDate && selectedEvent.endDate && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #E7E9ED",
                    paddingBottom: "8px",
                  }}
                >
                  <span style={{ color: "#67707F" }}>Date Range</span>
                  <span style={{ color: "#14161A", fontWeight: "600" }}>
                    {selectedEvent.startDate} → {selectedEvent.endDate} (
                    {selectedEvent.workingDays || 1}d)
                  </span>
                </div>
              )}

              {selectedEvent.date && !selectedEvent.startDate && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #E7E9ED",
                    paddingBottom: "8px",
                  }}
                >
                  <span style={{ color: "#67707F" }}>Date</span>
                  <span style={{ color: "#14161A", fontWeight: "600" }}>
                    {selectedEvent.date}
                  </span>
                </div>
              )}

              {selectedEvent.reason && (
                <div
                  style={{
                    borderBottom: "1px solid #E7E9ED",
                    paddingBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      color: "#67707F",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Reason
                  </span>
                  <p
                    style={{
                      margin: 0,
                      color: "#14161A",
                      background: "#F9FAFB",
                      padding: "8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      lineHeight: "1.45",
                    }}
                  >
                    {selectedEvent.reason}
                  </p>
                </div>
              )}

              {selectedEvent.description && (
                <div
                  style={{
                    borderBottom: "1px solid #E7E9ED",
                    paddingBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      color: "#67707F",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    Description
                  </span>
                  <p
                    style={{
                      margin: 0,
                      color: "#14161A",
                      background: "#F9FAFB",
                      padding: "8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      lineHeight: "1.45",
                    }}
                  >
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: "#F5F7FA",
                  border: "1px solid #D9DDE3",
                  color: "#14161A",
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
          background: "#F9FAFB",
          color: "#14161A",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
          borderLeft: "1px solid #E7E9ED",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #F9FAFB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#F9FAFB",
            zIndex: 10,
          }}
        >
          <div>
            <span
              style={{
                fontSize: "10.5px",
                letterSpacing: "0.08em",
                fontWeight: "700",
                color: "#67707F",
                textTransform: "uppercase",
              }}
            >
              GOVERNANCE
            </span>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: "#14161A",
                margin: "2px 0 0",
              }}
            >
              Manage {year} Holidays
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#F9FAFB",
              border: "none",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              fontSize: "16px",
              color: "#47505E",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              margin: "14px 24px 0",
              background: "#FEF0EE",
              border: "1px solid #F5C6C1",
              color: "#B42318",
              padding: "10px",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <form
            onSubmit={handleSave}
            style={{
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #E7E9ED",
              background: "#F9FAFB",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#14161A",
                  margin: 0,
                }}
              >
                {editingId ? "Edit Holiday" : "Add New Holiday"}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(blankForm);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#67707F",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#67707F",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Holiday Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g., Christmas"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #D9DDE3",
                    background: "#FFFFFF",
                    color: "#14161A",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#67707F",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Date *
                </label>
                <input
                  required
                  type="date"
                  value={form.holidayDate}
                  onChange={(e) =>
                    setForm({ ...form, holidayDate: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #D9DDE3",
                    background: "#FFFFFF",
                    color: "#14161A",
                    fontSize: "12px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#67707F",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Holiday Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #D9DDE3",
                    background: "#FFFFFF",
                    color: "#14161A",
                    fontSize: "12px",
                  }}
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="ORGANIZATION">ORGANIZATION</option>
                  <option value="OPTIONAL">OPTIONAL</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#67707F",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #D9DDE3",
                    background: "#FFFFFF",
                    color: "#14161A",
                    fontSize: "12px",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "16px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  color: "#47505E",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.recurring}
                  onChange={(e) =>
                    setForm({ ...form, recurring: e.target.checked })
                  }
                />
                Recurring Holiday (Annual)
              </label>

              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  color: "#47505E",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                Active
              </label>

              <button
                type="submit"
                style={{
                  marginLeft: "auto",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  background: "#2563EB",
                  color: "#FFFFFF",
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

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "#14161A",
                margin: "0 0 4px",
              }}
            >
              Holidays for {year} ({items.length})
            </h3>

            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#67707F",
                  fontSize: "12px",
                }}
              >
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  background: "#F9FAFB",
                  borderRadius: "8px",
                  color: "#67707F",
                  fontSize: "12px",
                }}
              >
                No holidays found for {year}.
              </div>
            ) : (
              items.map((h) => (
                <div
                  key={h.id || h.name}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #E7E9ED",
                    background: "#F9FAFB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    opacity: h.active ? 1 : 0.5,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <strong style={{ fontSize: "13px", color: "#14161A" }}>
                        {h.name}
                      </strong>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: "700",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          background: "#E9F6EF",
                          color: "#067647",
                        }}
                      >
                        {h.type}
                      </span>
                      {h.recurring && (
                        <span style={{ fontSize: "9.5px", color: "#3B82F6" }}>
                          Recurring
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#67707F",
                        marginTop: "2px",
                      }}
                    >
                      {h.holidayDate}{" "}
                      {h.description ? `· ${h.description}` : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => startEdit(h)}
                      style={{
                        background: "#F5F7FA",
                        border: "1px solid #D9DDE3",
                        color: "#14161A",
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
                        background: "#F5F7FA",
                        border: "1px solid #D9DDE3",
                        color: "#14161A",
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
                        background: "#FEF0EE",
                        border: "1px solid #F5C6C1",
                        color: "#B42318",
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
