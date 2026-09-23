import React, { useEffect, useState } from "react";
import api from "../api/api";
const Card = ({ icon, label, value, sub }) => (
  <div className="prod-kpi">
    <div className="prod-kpi-icon">{icon}</div>
    <div>
      <div className="stat-label">{label}</div>
      <div className="prod-kpi-value">{value ?? "—"}</div>
      {sub && <div className="prod-sub">{sub}</div>}
    </div>
  </div>
);
function LineChart({ data }) {
  const W = 620,
    H = 220,
    P = 24,
    max = Math.max(
      1,
      ...data.map((x) => Math.max(x.present || 0, x.absent || 0)),
    );
  const pts = (k) =>
    data
      .map(
        (d, i) =>
          `${P + i * ((W - 2 * P) / Math.max(1, data.length - 1))},${H - P - ((Number(d[k]) || 0) / max) * (H - 2 * P)}`,
      )
      .join(" ");
  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>Attendance Trend</h3>
        <span>Last {data.length} days</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="line-svg">
        <polyline points={pts("absent")} className="line line-absent" />
        <polyline points={pts("present")} className="line line-present" />
      </svg>
      <div className="legend">
        <span>● Present</span>
        <span>● Absent</span>
      </div>
    </div>
  );
}
const Bars = ({ title, data, labelKey, valueKey }) => {
  const max = Math.max(1, ...data.map((x) => Number(x[valueKey]) || 0));
  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>{title}</h3>
      </div>
      <div className="bar-chart">
        {data.length ? (
          data.map((x, i) => (
            <div className="bar-row" key={i}>
              <span className="bar-label">{x[labelKey]}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${((Number(x[valueKey]) || 0) / max) * 100}%`,
                  }}
                />
              </div>
              <b>{x[valueKey]}</b>
            </div>
          ))
        ) : (
          <p className="muted">No data yet.</p>
        )}
      </div>
    </div>
  );
};
function Donut({ data }) {
  const total = Math.max(
    1,
    data.reduce((s, x) => s + (x.count || 0), 0),
  );
  let start = 0;
  const colors = ["#3576c9", "#1d9a87", "#ff9f1c", "#805ad5", "#ef6461"];
  const seg = data.map((x, i) => {
    const dash = ((x.count || 0) / total) * 100;
    const r = (
      <circle
        key={i}
        cx="70"
        cy="70"
        r="52"
        fill="none"
        stroke={colors[i % colors.length]}
        strokeWidth="20"
        pathLength="100"
        strokeDasharray={`${dash} ${100 - dash}`}
        strokeDashoffset={-start}
        transform="rotate(-90 70 70)"
      />
    );
    start += dash;
    return r;
  });
  return (
    <div className="chart-card">
      <div className="chart-head">
        <h3>Inventory Distribution</h3>
      </div>
      <div className="donut-wrap">
        <svg viewBox="0 0 140 140">
          {seg}
          <text x="70" y="66" textAnchor="middle" className="donut-num">
            {total}
          </text>
          <text x="70" y="84" textAnchor="middle" className="donut-sub">
            items
          </text>
        </svg>
        <div>
          {data.map((x, i) => (
            <div className="legend-row" key={i}>
              <i style={{ background: colors[i % colors.length] }} />
              {x.category}
              <b>{x.count}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default function ProductionAnalyticsDashboard() {
  const [s, setS] = useState(),
    [trend, setTrend] = useState([]),
    [deps, setDeps] = useState([]),
    [leave, setLeave] = useState({}),
    [inv, setInv] = useState({}),
    [activity, setActivity] = useState([]),
    [err, setErr] = useState("");
  const load = async () => {
    try {
      const results = await Promise.allSettled([
        api.dashboardSummary(),
        api.attendanceAnalytics(7),
        api.departmentAnalytics(),
        api.leaveAnalytics(),
        api.inventoryAnalyticsV2(),
        api.recentActivity(),
      ]);
      const val = (i, fallback) =>
        results[i].status === "fulfilled" ? results[i].value : fallback;
      setS(
        val(0, {
          totalEmployees: 0,
          presentToday: 0,
          absentToday: 0,
          employeesOnLeave: 0,
          totalInventoryItems: 0,
          lowStockItems: 0,
          openDamageReports: 0,
          pendingRequests: 0,
        }),
      );
      setTrend(val(1, []));
      setDeps(val(2, []));
      setLeave(val(3, {}));
      setInv(val(4, {}));
      setActivity(val(5, []));
      const failed = results.filter((x) => x.status === "rejected");
      setErr(
        failed.length
          ? `${failed.length} data source(s) are temporarily unavailable. The rest of the dashboard is live.`
          : "",
      );
    } catch (e) {
      setErr(e.message);
    }
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  if (!s)
    return (
      <div className="card dashboard-loading">
        <div className="loading-spinner" />
        Loading live business data…
      </div>
    );
  return (
    <div className="production-dashboard">
      <div className="analytics-heading">
        <div>
          <h2 className="section-title">Business Dashboard</h2>
          <p className="section-sub">
            Operational overview from your live EMS database.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          ↻ Refresh
        </button>
      </div>
      {err && <div className="error-banner">{err}</div>}
      <div className="prod-kpi-grid">
        <Card icon="Users" label="Total Employees" value={s.totalEmployees} />
        <Card icon="Present" label="Present Today" value={s.presentToday} />
        <Card icon="Absent" label="Absent Today" value={s.absentToday} />
        <Card icon="Leave" label="On Leave Today" value={s.employeesOnLeave} />
        <Card
          icon="Inventory"
          label="Inventory Items"
          value={s.totalInventoryItems}
          sub={`${inv.totalUnits ?? 0} total units`}
        />
        <Card icon="Low stock" label="Low Stock" value={s.lowStockItems} />
        <Card
          icon="Damage"
          label="Open Damage Reports"
          value={s.openDamageReports}
        />
        <Card
          icon="Requests"
          label="Pending Requests"
          value={s.pendingRequests}
        />
      </div>
      <div className="dashboard-grid-main">
        <LineChart data={trend} />
        <Donut data={inv.byCategory || []} />
      </div>
      <div className="prod-grid two">
        <Bars
          title="Employees by Department"
          data={deps}
          labelKey="department"
          valueKey="count"
        />
        <div className="chart-card">
          <div className="chart-head">
            <h3>Leave Request Status</h3>
          </div>
          <div className="leave-summary">
            <div>
              <span>Pending</span>
              <b>{leave.pending ?? 0}</b>
            </div>
            <div>
              <span>Approved</span>
              <b>{leave.approved ?? 0}</b>
            </div>
            <div>
              <span>Rejected</span>
              <b>{leave.rejected ?? 0}</b>
            </div>
          </div>
        </div>
      </div>
      <div className="prod-grid two">
        <div className="chart-card">
          <div className="chart-head">
            <h3>Low Stock Alerts</h3>
            <span>{(inv.lowStock || []).length} items</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Stock</th>
                  <th>Minimum</th>
                </tr>
              </thead>
              <tbody>
                {(inv.lowStock || []).slice(0, 8).map((x) => (
                  <tr key={x.id}>
                    <td>{x.name}</td>
                    <td>
                      <b>{x.quantity}</b>
                    </td>
                    <td>{x.minimumQuantity}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan="3">No alerts</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-head">
            <h3>Recent Activity</h3>
            <span>Audit trail</span>
          </div>
          <div className="activity-list">
            {activity.length ? (
              activity.slice(0, 6).map((a, i) => (
                <div className="activity-row" key={i}>
                  <div className="activity-dot">•</div>
                  <div>
                    <b>{a.action}</b>
                    <p>{a.details || a.actor}</p>
                    <small>
                      {a.createdAt
                        ? new Date(a.createdAt).toLocaleString()
                        : ""}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No recent activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
