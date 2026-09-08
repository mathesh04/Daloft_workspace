from pathlib import Path
import re
root=Path('/mnt/data/ems_work')

# WorkspaceShell: collapse sidebar + localStorage + no remote logo latency
p=root/'frontend/src/components/WorkspaceShell.jsx'
s=p.read_text()
s=s.replace('import React, { useState } from "react";', 'import React, { useEffect, useState } from "react";')
s=s.replace('    menu: "M4 6h16M4 12h16M4 18h16",', '    menu: "M4 6h16M4 12h16M4 18h16",\n    collapse: "M15 6 9 12l6 6",')
s=s.replace('      <img className="daloft-logo-image" src="https://respark.iitm.ac.in/img/company-logos/Daloft.png" alt="Daloft Aerospace" onError={(e)=>{e.currentTarget.style.display="none"; e.currentTarget.nextElementSibling.style.display="flex";}} />\n      <span className="daloft-fallback"', '      <span className="daloft-fallback"')
s=s.replace('  const [open, setOpen] = useState(false);', '  const [open, setOpen] = useState(false);\n  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("daloft_sidebar_collapsed") === "1");\n  useEffect(() => { localStorage.setItem("daloft_sidebar_collapsed", collapsed ? "1" : "0"); }, [collapsed]);')
s=s.replace('    <div className="enterprise-shell">\n      <aside className={`enterprise-sidebar ${open ? "open" : ""}`}>', '    <div className={`enterprise-shell ${collapsed ? "sidebar-collapsed" : ""}`}>\n      <aside className={`enterprise-sidebar ${open ? "open" : ""}`}>')
s=s.replace('<div className="sidebar-head"><DaloftBrand /><button className="sidebar-close"', '<div className="sidebar-head"><DaloftBrand compact={collapsed} /><button className="sidebar-collapse" onClick={() => setCollapsed(v => !v)} title={collapsed ? "Expand sidebar" : "Minimize sidebar"} aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}><Icon name="collapse" /></button><button className="sidebar-close"')
s=s.replace('<span>{item.label}</span>{item.badge ?', '<span className="nav-label">{item.label}</span>{item.badge ?')
s=s.replace('<span>{action.label}</span></button>', '<span className="nav-label">{action.label}</span></button>')
s=s.replace('<button className="side-nav-item workspace-action" onClick={signOut}><Icon name="logout"/><span>Sign out</span></button>', '<button className="side-nav-item workspace-action" onClick={signOut}><Icon name="logout"/><span className="nav-label">Sign out</span></button>')
p.write_text(s)

# AttendanceTable replace fully with robust lazy correction queue
p=root/'frontend/src/components/AttendanceTable.jsx'
p.write_text(r'''import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { StatusBadge } from "./StatusBadges";

function fmtTime(iso) { if (!iso) return "—"; return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(d) { if (!d) return "—"; return new Date(d).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }); }
function employeeName(r){ return r?.employee?.name || r?.employee?.employeeId || "Unknown employee"; }

export default function AttendanceTable() {
  const [view, setView] = useState("today");
  const [todayRows, setTodayRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [correctionLoading, setCorrectionLoading] = useState(false);

  const loadToday = async () => { setLoading(true); setError(""); try { setTodayRows(await api.todayAttendance()); } catch(e){ setError(e.message || "Unable to load today's attendance"); } finally { setLoading(false); } };
  const loadHistory = async () => { setLoading(true); setError(""); try { setAllRows(await api.allAttendance()); } catch(e){ setError(e.message || "Unable to load attendance history"); } finally { setLoading(false); } };
  const loadCorrections = async () => { setCorrectionLoading(true); setError(""); try { setCorrections(await api.adminAttendanceCorrections() || []); } catch(e){ setError(e.message || "Unable to load attendance corrections"); } finally { setCorrectionLoading(false); } };
  useEffect(() => { loadToday(); }, []);
  useEffect(() => { if(view === "all" && !allRows.length) loadHistory(); if(view === "corrections") loadCorrections(); }, [view]);

  const presentToday = todayRows.filter(r => r.checkInTime).length;
  const stillIn = todayRows.filter(r => r.checkInTime && !r.checkOutTime).length;
  const pendingCorrections = corrections.filter(r => String(r.status || "").toUpperCase() === "PENDING").length;

  return <div className="attendance-workspace">
    {error && <div className="error-banner">{error}</div>}
    <div className="attendance-hero"><div><span className="eyebrow">TIME & ATTENDANCE</span><h2>Attendance control</h2><p>Monitor attendance and resolve employee correction requests with an auditable approval flow.</p></div><button className="btn btn-ghost" onClick={() => view === "today" ? loadToday() : view === "all" ? loadHistory() : loadCorrections()}>↻ Refresh</button></div>
    <div className="grid grid-3 attendance-stats"><div className="stat-card"><span className="stat-label">Checked in today</span><div className="stat-value">{presentToday}</div><small>Employees with a start time</small></div><div className="stat-card"><span className="stat-label">Currently on the clock</span><div className="stat-value">{stillIn}</div><small>Not checked out yet</small></div><div className="stat-card"><span className="stat-label">Pending corrections</span><div className="stat-value">{pendingCorrections}</div><small>Awaiting admin decision</small></div></div>
    <div className="tabs"><button className={`tab-btn ${view === "today" ? "active" : ""}`} onClick={() => setView("today")}>Today</button><button className={`tab-btn ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>Full history</button><button className={`tab-btn ${view === "corrections" ? "active" : ""}`} onClick={() => setView("corrections")}>Corrections {pendingCorrections ? `(${pendingCorrections})` : ""}</button></div>
    {view === "corrections" ? <CorrectionQueue rows={corrections} loading={correctionLoading} reload={loadCorrections}/> : <AttendanceRows rows={view === "today" ? todayRows : allRows} loading={loading} today={view === "today"}/>} 
  </div>;
}

function AttendanceRows({rows,loading,today}) { return <div className="card attendance-table-card"><div className="table-wrap"><table><thead><tr><th>Employee</th><th>Department</th><th>Date</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><b>{employeeName(row)}</b><span className="muted"> {row.employee?.employeeId ? `(${row.employee.employeeId})` : ""}</span></td><td>{row.employee?.department || "—"}</td><td>{fmtDate(row.workDate)}</td><td>{fmtTime(row.checkInTime)}</td><td>{fmtTime(row.checkOutTime)}</td><td><StatusBadge status={row.status}/></td></tr>)}{!loading && !rows.length && <tr><td colSpan="6" className="empty-state">No attendance records for {today ? "today" : "this history view"}.</td></tr>}{loading && <tr><td colSpan="6" className="table-loading">Loading attendance…</td></tr>}</tbody></table></div></div>; }

function CorrectionQueue({rows,loading,reload}) {
 const [busyId,setBusyId]=useState(null),[modal,setModal]=useState(null);
 const pending=useMemo(()=>rows.filter(r=>String(r.status||"").toUpperCase()==="PENDING"),[rows]);
 const review=async(status)=>{if(!modal)return; if(status==="REJECTED"&&!modal.reason.trim())return setModal({...modal,error:"A rejection reason is required."}); setBusyId(modal.id); try{await api.reviewAdminAttendanceCorrection(modal.id,status,modal.reason.trim());setModal(null);await reload();}catch(e){setModal({...modal,error:e.message||"Unable to process correction"});}finally{setBusyId(null)}};
 return <div className="correction-workspace"><div className="correction-summary"><div><span>Approval queue</span><strong>{pending.length}</strong><small>pending requests</small></div><div><span>Review standard</span><strong>2-step</strong><small>validate time + reason</small></div><div><span>Audit trail</span><strong>ON</strong><small>decision is logged</small></div></div><div className="card"><div className="card-head"><div><h3>Attendance correction requests</h3><p className="section-sub">Review the requested time against the original attendance record before approving.</p></div></div>{loading?<div className="table-loading">Loading correction queue…</div>:!rows.length?<div className="empty-state">No attendance correction requests.</div>:<div className="correction-list">{rows.map(r=>{const a=r.attendance||{};const status=String(r.status||"PENDING").toUpperCase();return <article className={`correction-card correction-${status.toLowerCase()}`} key={r.id}><div className="correction-main"><div className="correction-person"><div className="avatar correction-avatar">{employeeName(r).split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><div><b>{employeeName(r)}</b><small>{r.employee?.employeeId || ""} · {r.employee?.department || "No department"}</small></div></div><div className="correction-date"><span>Attendance date</span><b>{fmtDate(a.workDate)}</b></div><div className="correction-times"><div><span>Current</span><b>{fmtTime(a.checkInTime)} → {fmtTime(a.checkOutTime)}</b></div><div><span>Requested</span><b>{fmtTime(r.requestedCheckIn || a.checkInTime)} → {fmtTime(r.requestedCheckOut || a.checkOutTime)}</b></div></div><div className="correction-reason"><span>Employee reason</span><p>{r.reason || "No reason provided"}</p></div></div><div className="correction-footer"><StatusBadge status={status}/><small>{r.createdAt ? `Submitted ${new Date(r.createdAt).toLocaleString()}` : ""}{r.reviewedBy ? ` · Reviewed by ${r.reviewedBy}` : ""}</small>{status === "PENDING" ? <div className="correction-actions"><button className="btn btn-danger" disabled={busyId===r.id} onClick={()=>setModal({id:r.id,status:"REJECTED",reason:"",error:""})}>Reject</button><button className="btn btn-accent" disabled={busyId===r.id} onClick={()=>setModal({id:r.id,status:"APPROVED",reason:"",error:""})}>Approve correction</button></div>:<span className="muted">{r.reviewReason || "Decision recorded"}</span>}</div></article>})}</div>}</div>{modal&&<div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setModal(null)}><div className="modal correction-modal"><div className="modal-header"><div><h3>{modal.status === "APPROVED" ? "Approve attendance correction" : "Reject attendance correction"}</h3><p className="section-sub">{modal.status === "APPROVED" ? "The requested times will replace the attendance record." : "Give the employee a clear reason for the rejection."}</p></div><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>{modal.status === "REJECTED" && <div className="field"><label>Rejection reason *</label><textarea autoFocus value={modal.reason} onChange={e=>setModal({...modal,reason:e.target.value,error:""})} placeholder="Example: Requested time conflicts with approved leave."/></div>}{modal.error&&<div className="error-banner">{modal.error}</div>}<div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button><button className={`btn ${modal.status === "APPROVED" ? "btn-accent" : "btn-danger-solid"}`} disabled={busyId===modal.id} onClick={()=>review(modal.status)}>{busyId===modal.id?"Processing…":modal.status === "APPROVED"?"Approve & update":"Reject request"}</button></div></div></div>}</div>;
}
''')

# AdminDashboard lazy load and component render
p=root/'frontend/src/components/AdminDashboard.jsx'
s=p.read_text()
# Replace imports with lazy imports
imports='''import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";\nimport { useAuth } from "../context/AuthContext";\nimport { useNavigate, useLocation } from "react-router-dom";\nimport WorkspaceShell from "./WorkspaceShell";\nimport api from "../api/api";\n\nconst EmployeeList = lazy(() => import("./EmployeeList"));\nconst AttendanceTable = lazy(() => import("./AttendanceTable"));\nconst Announcements = lazy(() => import("./Announcements"));\nconst Tasks = lazy(() => import("./Tasks"));\nconst Inventory = lazy(() => import("./Inventory"));\nconst LeaveManagement = lazy(() => import("./LeaveManagement"));\nconst Notifications = lazy(() => import("./Notifications"));\nconst DamageReports = lazy(() => import("./DamageReports"));\nconst OfficeLocations = lazy(() => import("./OfficeLocations"));\nconst Reports = lazy(() => import("./Reports"));\nconst SystemAdminPanel = lazy(() => import("./SystemAdminPanel"));\nconst AnalyticsDashboard = lazy(() => import("./AnalyticsDashboard"));\n'''
s=re.sub(r'^import React,.*?import api from "\.\./api/api";\n',imports,s,flags=re.S)
s=s.replace('component:<EmployeeList/>','component:EmployeeList').replace('component:<AttendanceTable/>','component:AttendanceTable').replace('component:<Announcements adminMode/>','component:Announcements').replace('component:<Tasks adminMode/>','component:Tasks').replace('component:<Inventory/>','component:Inventory').replace('component:<LeaveManagement adminMode/>','component:LeaveManagement').replace('component:<OfficeLocations/>','component:OfficeLocations').replace('component:<DamageReports adminMode/>','component:DamageReports').replace('component:<Reports/>','component:Reports').replace('component:<SystemAdminPanel section="holidays"/>','component:SystemAdminPanel')
s=s.replace('<WorkspaceShell title={title}', '<WorkspaceShell title={title}')
s=s.replace('  return <WorkspaceShell title={title} subtitle={subtitle} navItems={nav} active={tab} onNavigate={select} workspaceActions={actions}>', '  return <WorkspaceShell title={title} subtitle={subtitle} navItems={nav} active={tab} onNavigate={select} workspaceActions={actions}>\n    <Suspense fallback={<LoadingCard text="Loading workspace module…"/>}>')
s=s.replace('  </WorkspaceShell>;', '    </Suspense>\n  </WorkspaceShell>;')
s=s.replace('{allowed.map(m=>tab===m.key?<React.Fragment key={m.key}>{m.component}</React.Fragment>:null)}', '{allowed.map(m=>{const Component=m.component; return tab===m.key?<Component key={m.key} adminMode/>:null;})}')
s=s.replace('{tab==="dashboard"&&<AnalyticsDashboard/>}', '{tab==="dashboard"&&<AnalyticsDashboard/>}')
# system workspace children lazy + suspense already wraps all
s=s.replace('<SystemAdminPanel section="control"/>','<SystemAdminPanel section="control"/>')
p.write_text(s)

# SystemAdminPanel add office timing settings
p=root/'frontend/src/components/SystemAdminPanel.jsx'
s=p.read_text()
s=s.replace('const numberMeta={GEOFENCE_RADIUS:[\'Geofence radius\',\'meters\',1,50000],MAX_GPS_ACCURACY', 'const numberMeta={GEOFENCE_RADIUS:[\'Geofence radius\',\'meters\',1,50000],MAX_GPS_ACCURACY')
# Insert timing card before System card
needle='   <div className="settings-card"><h3>System</h3>'
timing='''   <div className="settings-card office-timing-card"><div className="settings-section-title"><div><h3>Office timing</h3><p className="muted">Define the organization work window used by attendance and late-status rules.</p></div><span className="status-badge">LIVE POLICY</span></div><div className="timing-grid"><label className="settings-text-field"><span>Office opens</span><input type="time" value={settings.WORK_START_TIME||'09:00'} onChange={e=>set('WORK_START_TIME',e.target.value)}/></label><label className="settings-text-field"><span>Office closes</span><input type="time" value={settings.WORK_END_TIME||'18:00'} onChange={e=>set('WORK_END_TIME',e.target.value)}/></label><label className="settings-text-field"><span>Time zone</span><select value={settings.TIMEZONE||'Asia/Kolkata'} onChange={e=>set('TIMEZONE',e.target.value)}><option>Asia/Kolkata</option><option>UTC</option><option>Asia/Singapore</option><option>Europe/London</option><option>America/New_York</option></select></label><NumberField label="Late grace" unit="minutes" min={0} max={1440} value={settings.LATE_GRACE_MINUTES??10} onChange={v=>set('LATE_GRACE_MINUTES',Number(v))}/></div><div className="timing-preview"><span>Attendance rule</span><b>{settings.WORK_START_TIME||'09:00'} + {settings.LATE_GRACE_MINUTES??10} min grace</b><small>Employees after the grace window are marked late.</small></div></div>\n'''
s=s.replace(needle,timing+needle)
# Remove duplicate timezone in System card? Keep but rename system to only maintenance/working days; remove timezone label block
s=s.replace('<label className="settings-text-field"><span>Timezone</span><select value={settings.TIMEZONE||\'Asia/Kolkata\'} onChange={e=>set(\'TIMEZONE\',e.target.value)}><option>Asia/Kolkata</option><option>UTC</option><option>Asia/Singapore</option><option>Europe/London</option><option>America/New_York</option></select></label>', '')
p.write_text(s)

# Backend settings: add time keys and normalization
p=root/'backend/src/main/java/com/ems/service/SystemSettingsService.java'
s=p.read_text()
s=s.replace('Map.entry("WORKING_DAYS", "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"),', 'Map.entry("WORKING_DAYS", "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"),\n            Map.entry("WORK_START_TIME", "09:00"),\n            Map.entry("WORK_END_TIME", "18:00"),')
s=s.replace('        if ("WORKING_DAYS".equals(key)) {', '        if ("WORK_START_TIME".equals(key) || "WORK_END_TIME".equals(key)) {\n            if (text.isBlank()) throw new IllegalArgumentException(key.replace("_", " ") + " is required");\n            try { java.time.LocalTime.parse(text); } catch (Exception ex) { throw new IllegalArgumentException(key.replace("_", " ") + " must use HH:mm format"); }\n            return java.time.LocalTime.parse(text).toString().length() == 5 ? java.time.LocalTime.parse(text).toString() : java.time.LocalTime.parse(text).toString();\n        }\n        if ("WORKING_DAYS".equals(key)) {')
p.write_text(s)

# Backend attendance use configurable start time
for fn in ['backend/src/main/java/com/ems/service/AttendanceService.java','backend/src/main/java/com/ems/service/AttendanceRegularizationService.java']:
    p=root/fn; s=p.read_text()
    s=s.replace('LocalTime cutoff=LocalTime.of(9,0).plusMinutes(settings.getInt("LATE_GRACE_MINUTES",10));', 'LocalTime start=LocalTime.parse(settings.getString("WORK_START_TIME","09:00")); LocalTime cutoff=start.plusMinutes(settings.getInt("LATE_GRACE_MINUTES",10));')
    p.write_text(s)

# Migration V13
mig=root/'backend/src/main/resources/db/migration/V13__office_timing_settings.sql'
mig.write_text('''INSERT INTO system_settings(setting_key, setting_value, description) VALUES\n('WORK_START_TIME','09:00','Organization office opening time used for attendance late calculations'),\n('WORK_END_TIME','18:00','Organization office closing time for display and policy reference')\nON CONFLICT (setting_key) DO NOTHING;\n''')

# App CSS append/override
p=root/'frontend/src/App.css'
s=p.read_text()
s += r'''
/* V10 performance + premium workspace polish */
.enterprise-sidebar{transition:width .18s ease,transform .18s ease}
.shell-main{transition:margin-left .18s ease,width .18s ease}
.sidebar-collapse{width:30px;height:30px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);color:#b7c8c1;border-radius:9px;display:grid;place-items:center;cursor:pointer}
.sidebar-collapse:hover{background:rgba(255,255,255,.1);color:#fff}
.sidebar-collapse .nav-icon{width:15px;height:15px;transition:transform .18s ease}
.sidebar-collapsed .sidebar-collapse .nav-icon{transform:rotate(180deg)}
.sidebar-collapsed .enterprise-sidebar{width:78px;flex-basis:78px;padding-left:10px;padding-right:10px}
.sidebar-collapsed .shell-main{margin-left:78px;width:calc(100% - 78px)}
.sidebar-collapsed .sidebar-head{justify-content:center;padding-left:0;padding-right:0}
.sidebar-collapsed .daloft-brand-copy,.sidebar-collapsed .product-name,.sidebar-collapsed .sidebar-context div,.sidebar-collapsed .nav-section,.sidebar-collapsed .nav-label,.sidebar-collapsed .sidebar-footer{display:none}
.sidebar-collapsed .daloft-brand{justify-content:center}.sidebar-collapsed .sidebar-context{justify-content:center;padding:10px 0}.sidebar-collapsed .side-nav-item{justify-content:center;padding:11px 8px}.sidebar-collapsed .side-nav-item em{position:absolute;margin-left:28px;margin-top:-22px}.sidebar-collapsed .sidebar-context{margin-bottom:12px}
.sidebar-collapsed .sidebar-bottom .workspace-action{justify-content:center}
.daloft-fallback{display:flex;align-items:center;gap:10px}
.attendance-workspace{display:flex;flex-direction:column;gap:16px}.attendance-hero{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:21px 23px;border:1px solid var(--line);background:linear-gradient(135deg,#fff,#f5faf7);border-radius:18px;box-shadow:var(--shadow-premium)}.attendance-hero h2{margin:5px 0;font-size:22px}.attendance-hero p{margin:0;color:#7b8984;font-size:10px}.attendance-stats{margin:0}.attendance-stats .stat-card small{display:block;margin-top:4px;color:#8c9893;font-size:9px}.attendance-table-card{padding:8px}.table-loading{padding:30px;text-align:center;color:#7b8984;font-size:11px}.correction-workspace{display:flex;flex-direction:column;gap:15px}.correction-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.correction-summary>div{background:linear-gradient(135deg,#102d22,#194b37);color:#fff;border-radius:15px;padding:15px 17px;display:flex;flex-direction:column;gap:3px}.correction-summary span{font-size:8px;text-transform:uppercase;letter-spacing:.12em;color:#a6c7b7;font-weight:800}.correction-summary strong{font-size:22px;font-family:var(--font-display)}.correction-summary small{font-size:8px;color:#9eb9ad}.correction-list{display:flex;flex-direction:column;gap:11px}.correction-card{border:1px solid var(--line);border-radius:14px;padding:15px;background:#fff}.correction-card:hover{box-shadow:0 10px 25px rgba(20,42,34,.06)}.correction-main{display:grid;grid-template-columns:1.35fr .75fr 1.35fr 1.3fr;gap:14px;align-items:center}.correction-person{display:flex;gap:10px;align-items:center}.correction-person div:last-child{display:flex;flex-direction:column;gap:3px}.correction-person b{font-size:11px}.correction-person small,.correction-date span,.correction-times span,.correction-reason span{font-size:8px;color:#8b9892}.correction-avatar{width:34px;height:34px;border-radius:10px;background:#edf7f1;color:#1b7a4e;font-size:10px}.correction-date,.correction-times,.correction-reason{display:flex;flex-direction:column;gap:4px}.correction-times{gap:8px}.correction-times div{display:flex;flex-direction:column;gap:2px}.correction-times b{font-size:10px}.correction-reason p{font-size:9px;line-height:1.45;color:#56655f;margin:0}.correction-footer{display:flex;align-items:center;gap:10px;margin-top:13px;padding-top:11px;border-top:1px solid #edf1ef}.correction-footer>small{color:#909b96;font-size:8px;flex:1}.correction-actions{display:flex;gap:7px}.correction-modal{max-width:540px}.section-sub{color:#7c8984;font-size:10px}.settings-section-title{display:flex;justify-content:space-between;align-items:flex-start;gap:15px}.timing-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.settings-text-field input[type=time]{width:100%;padding:11px;border:1px solid #d7dde5;border-radius:9px;background:#fff}.timing-preview{margin-top:14px;padding:13px 14px;border-radius:11px;background:#f3f8f5;border:1px solid #dbece2;display:flex;align-items:center;gap:12px}.timing-preview span{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#6c8177;font-weight:800}.timing-preview b{font-size:11px;color:#204c39}.timing-preview small{font-size:8px;color:#82908a;margin-left:auto}
@media(max-width:1100px){.sidebar-collapsed .enterprise-sidebar{width:78px}.sidebar-collapsed .shell-main{margin-left:78px;width:calc(100% - 78px)}.correction-main{grid-template-columns:1fr 1fr}.correction-reason{grid-column:1/-1}}
@media(max-width:760px){.sidebar-collapse{display:none}.sidebar-collapsed .enterprise-sidebar{width:270px}.sidebar-collapsed .shell-main{margin-left:0;width:100%}.sidebar-collapsed .daloft-brand-copy,.sidebar-collapsed .product-name,.sidebar-collapsed .sidebar-context div,.sidebar-collapsed .nav-section,.sidebar-collapsed .nav-label,.sidebar-collapsed .sidebar-footer{display:flex}.sidebar-collapsed .daloft-brand-copy{display:flex}.sidebar-collapsed .product-name{display:inline}.sidebar-collapsed .sidebar-context div{display:flex}.sidebar-collapsed .nav-section{display:block}.sidebar-collapsed .nav-label{display:inline}.sidebar-collapsed .sidebar-footer{display:flex}.sidebar-collapsed .side-nav-item{justify-content:flex-start;padding:10px 11px}.attendance-hero{align-items:flex-start;flex-direction:column}.correction-summary{grid-template-columns:1fr}.correction-main{grid-template-columns:1fr}.correction-reason{grid-column:auto}.correction-footer{align-items:flex-start;flex-wrap:wrap}.correction-actions{width:100%}.correction-actions .btn{flex:1}.timing-grid{grid-template-columns:1fr}.timing-preview{align-items:flex-start;flex-direction:column}.timing-preview small{margin-left:0}}
'''
p.write_text(s)

print('patched')
