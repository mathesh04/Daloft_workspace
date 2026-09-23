
const IST = "Asia/Kolkata";


export function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}


export function istDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: IST, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}


export function istTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleTimeString("en-IN", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: true });
}


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
