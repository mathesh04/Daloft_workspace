import React from "react";

export function StatusBadge({ status }) {
  const map = {
    PRESENT: "badge-success",
    LATE: "badge-warning",
    HALF_DAY: "badge-neutral",
  };
  return (
    <span className={`badge ${map[status] || "badge-neutral"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

export function TaskBadge({ status }) {
  const map = {
    PENDING: "badge-neutral",
    IN_PROGRESS: "badge-warning",
    COMPLETED: "badge-success",
  };
  return (
    <span className={`badge ${map[status] || "badge-neutral"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}
