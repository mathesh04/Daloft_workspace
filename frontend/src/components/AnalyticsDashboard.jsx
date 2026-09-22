import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const n = (v) => Number(v || 0);
const pct = (a,b) => b ? Math.round((a/b)*100) : 0;

function Metric({ label, value, meta, tone = "neutral", icon }) {
  return <div className={`metric-card tone-${tone}`}><div className="metric-head"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span></div><strong>{value}</strong><small>{meta}</small></div>;
}

function MiniBars({ rows = [], valueKey = "present" }) {
  const max = Math.max(1, ...rows.map(r => n(r[valueKey])));
  return <div className="mini-bars">{rows.map((r,i)=><div className="mini-bar" key={r.date || i} title={`${r.date || ""}: ${r[valueKey] || 0}`}><span style={{height:`${Math.max(8,(n(r[valueKey])/max)*100)}%`}}/><small>{r.date ? new Date(r.date).toLocaleDateString(undefined,{weekday:"short"}).slice(0,3) : i+1}</small></div>)}</div>;
}

export default function AnalyticsDashboard({ role = "ADMIN" }) {
  const [data,setData]=useState({}); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{
    let alive=true; setLoading(true);
    Promise.allSettled([api.dashboardSummary(),api.attendanceAnalytics(7),api.departmentAnalytics(),api.leaveAnalytics(),api.inventoryAnalyticsV2(),api.recentActivity()])
      .then(rs=>{if(!alive)return; const val=i=>rs[i].status==='fulfilled'?rs[i].value:null; setData({summary:val(0)||{},attendance:val(1)||[],departments:val(2)||[],leaves:val(3)||{},inventory:val(4)||{},activity:val(5)||[]}); if(rs.every(x=>x.status==='rejected'))setError("Analytics service is temporarily unavailable.");})
      .finally(()=>alive&&setLoading(false));
    return()=>{alive=false};
  },[]);
  const s=data.summary||{}; const attendance=data.attendance||[]; const depts=data.departments||[]; const leave=data.leaves||{}; const inv=data.inventory||{};
  const maxDept=Math.max(1,...depts.map(x=>n(x.count)));
  const leaveTotal=Math.max(1,n(leave.pending)+n(leave.approved)+n(leave.rejected));
  const presence=pct(n(s.presentToday),n(s.totalEmployees));
  const absent=pct(n(s.absentToday),n(s.totalEmployees));
  const today=attendance[attendance.length-1]||{};
  return <div className="analytics-page">
    {error&&<div className="error-banner">{error}</div>}
    <section className="welcome-banner"><div><span className="eyebrow">LIVE OPERATIONS</span><h2>Workforce command center</h2><p>People, attendance, leave and workplace operations in one fast view.</p></div><div className="today-pill"><span>{new Date().toLocaleDateString(undefined,{weekday:"long",day:"2-digit",month:"short",year:"numeric"})}</span><strong>{loading?"Syncing…":`${presence}% present today`}</strong></div></section>
    <div className="metric-grid">
      <Metric label="Active employees" value={loading?"—":s.totalEmployees} meta="Current workforce" tone="green" icon="👥"/>
      <Metric label="Present today" value={loading?"—":s.presentToday} meta={`${presence}% of active workforce`} tone="blue" icon="✓"/>
      <Metric label="On leave" value={loading?"—":s.employeesOnLeave} meta="Approved leave today" tone="amber" icon="◷"/>
      <Metric label="Pending actions" value={loading?"—":s.pendingRequests} meta="Leave + inventory requests" tone="red" icon="!"/>
    </div>
    <div className="analytics-grid main-grid">
      <section className="premium-card attendance-chart"><div className="card-head"><div><span className="eyebrow">ATTENDANCE</span><h3>7-day workforce pulse</h3></div><span className="live-tag">● Live</span></div><div className="chart-summary"><div><strong>{presence}%</strong><span>today presence</span></div><div><strong>{n(today.late)}</strong><span>late check-ins</span></div><div><strong>{absent}%</strong><span>absence rate</span></div></div><MiniBars rows={attendance} valueKey="present"/><div className="legend"><span><i className="legend-dot present"/>Present</span><span><i className="legend-dot late"/>Late</span><span><i className="legend-dot absent"/>Absent</span></div></section>
      <section className="premium-card leave-card"><div className="card-head"><div><span className="eyebrow">LEAVE PIPELINE</span><h3>Requests overview</h3></div><span className="muted">All records</span></div><div className="donut-wrap"><div className="donut" style={{background:`conic-gradient(var(--green) 0 ${n(leave.approved)/leaveTotal*100}%, var(--amber) ${n(leave.approved)/leaveTotal*100}% ${(n(leave.approved)+n(leave.pending))/leaveTotal*100}%, var(--red) ${(n(leave.approved)+n(leave.pending))/leaveTotal*100}% 100%)`}}><div><strong>{leaveTotal===1?0:leaveTotal}</strong><span>Total</span></div></div><div className="donut-list"><div><span><i className="legend-dot present"/>Approved</span><b>{n(leave.approved)}</b></div><div><span><i className="legend-dot pending"/>Pending</span><b>{n(leave.pending)}</b></div><div><span><i className="legend-dot absent"/>Rejected</span><b>{n(leave.rejected)}</b></div></div></div></section>
    </div>
    <div className="analytics-grid second-grid">
      <section className="premium-card"><div className="card-head"><div><span className="eyebrow">WORKFORCE MIX</span><h3>People by department</h3></div><span className="muted">{depts.length} groups</span></div><div className="department-bars">{depts.slice(0,7).map(d=><div className="department-row" key={d.department}><div><span>{d.department}</span><b>{d.count}</b></div><div className="progress"><i style={{width:`${n(d.count)/maxDept*100}%`}}/></div></div>)}{!depts.length&&<div className="empty-state">Department data will appear here once employees are assigned.</div>}</div></section>
      <section className="premium-card"><div className="card-head"><div><span className="eyebrow">WORKPLACE HEALTH</span><h3>Operational watchlist</h3></div><span className="status-chip success">Healthy view</span></div><div className="watch-list"><div><span className="watch-icon">◈</span><div><strong>Inventory</strong><small>{n(inv.lowStock?.length)} items at or below minimum</small></div><b>{n(inv.totalUnits)}</b></div><div><span className="watch-icon">⌁</span><div><strong>Damage reports</strong><small>Open reports requiring follow-up</small></div><b>{n(s.openDamageReports)}</b></div><div><span className="watch-icon">◷</span><div><strong>Attendance</strong><small>Today’s workforce coverage</small></div><b>{presence}%</b></div><div><span className="watch-icon">!</span><div><strong>Requests</strong><small>Pending employee actions</small></div><b>{n(s.pendingRequests)}</b></div></div></section>
    </div>
    <section className="premium-card activity-card"><div className="card-head"><div><span className="eyebrow">AUDIT STREAM</span><h3>Recent activity</h3></div><span className="muted">Latest organization events</span></div><div className="activity-list">{(data.activity||[]).slice(0,6).map((x,i)=><div className="activity-item" key={`${x.createdAt}-${i}`}><span className="activity-line"><i/></span><div><strong>{x.action || "Activity"}</strong><p>{x.details || `Action performed by ${x.actor || "system"}.`}</p></div><time>{x.createdAt ? new Date(x.createdAt).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}</time></div>)}{!data.activity?.length&&<div className="empty-state">No recent activity is available.</div>}</div></section>
  </div>;
}
