// Central India-safe date & time helpers.
// Problem these solve:
//  1) new Date().toISOString() returns UTC — between 00:00 and 05:29 IST it
//     gives YESTERDAY's date, so reports were stored with the wrong day.
//  2) toLocale* without a fixed timezone follows the device clock — employees
//     with a non-Indian timezone/region setting saw wrong dates everywhere.

const IST = "Asia/Kolkata";

/** Today's date in India, as YYYY-MM-DD (safe for <input type="date">). */
export function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

/** Full date + time in India, e.g. "21/09/2026, 02:35 pm". Blank for empty input. */
export function istDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: IST, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

/** Time only in India, e.g. "02:35 pm". */
export function istTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: true });
}

/** "Today / Yesterday / N days ago" style label, computed in IST. */
export function relativeIST(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const now = new Date();
  const day = (x) => x.toLocaleDateString("en-CA", { timeZone: IST });
  const days = Math.round((day(now) === day(d) ? 0 : (new Date(day(now)) - new Date(day(d))) / 86400000));
  if (day(now) === day(d)) return "Today";
  if (days === 1 || new Date(day(now)) - new Date(day(d)) === 86400000) return "Yesterday";
  if (days > 1 && days < 7) return `${days} days ago`;
  return istDateTime(iso);
}
