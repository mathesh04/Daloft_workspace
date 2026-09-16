import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import WorkspaceShell from "./WorkspaceShell";
import api from "../api/api";

const EmployeeList = lazy(() => import("./EmployeeList"));
const AttendanceTable = lazy(() => import("./AttendanceTable"));
const Announcements = lazy(() => import("./Announcements"));
const Tasks = lazy(() => import("./Tasks"));
const Inventory = lazy(() => import("./Inventory"));
const LeaveManagement = lazy(() => import("./LeaveManagement"));
const Notifications = lazy(() => import("./Notifications"));
const DamageReports = lazy(() => import("./DamageReports"));
const OfficeLocations = lazy(() => import("./OfficeLocations"));
const Reports = lazy(() => import("./Reports"));
const SystemAdminPanel = lazy(() => import("./SystemAdminPanel"));
const AnalyticsDashboard = lazy(() => import("./AnalyticsDashboard"));
const DailyWorkReportsAdmin = lazy(() => import("./DailyWorkReportsAdmin"));
const HolidayModule = (props) => <SystemAdminPanel section="holidays" {...props}/>;

const MODULES = [
  { key:"people", permission:"PEOPLE", label:"People", icon:"people", component:EmployeeList },
  { key:"attendance", permission:"ATTENDANCE", label:"Attendance", icon:"calendar", component:AttendanceTable },
  { key:"daily-reports", permission:"REPORTS", label:"Daily Work Reports", icon:"report", component:DailyWorkReportsAdmin },
  { key:"announcements", permission:"COMMUNICATION", label:"Announcements", icon:"bell", component:Announcements },
  { key:"tasks", permission:"TASKS", label:"Tasks", icon:"tasks", component:Tasks },
  { key:"inventory", permission:"INVENTORY", label:"Inventory", icon:"box", component:Inventory },
  { key:"leave", permission:"LEAVE", label:"Leave Management", icon:"leave", component:LeaveManagement },
  { key:"offices", permission:"OFFICE", label:"Office Locations", icon:"location", component:OfficeLocations },
  { key:"damage", permission:"PEOPLE", label:"Damage Reports", icon:"report", component:DamageReports },
  { key:"reports", permission:"REPORTS", label:"Reports & Analytics", icon:"report", component:Reports },
  { key:"holidays", permission:"HOLIDAY_CALENDAR", label:"Holiday Calendar", icon:"calendar", component:HolidayModule },
];

const SYSTEM_NAV = [
  {key:"system",label:"Control Center",icon:"home"},
  {key:"employees",label:"HR Administrators",icon:"people"},
  {key:"offices",label:"Offices & Geofences",icon:"location"},
  {key:"organization",label:"Organization",icon:"people"},
  {key:"daily-reports",label:"Daily Work Reports",icon:"report"},
  {key:"security",label:"Security Center",icon:"shield"},
  {key:"audit",label:"Audit Logs",icon:"audit"},
  {key:"settings",label:"Configuration",icon:"settings"},
  {key:"holidays",label:"Holiday Calendar",icon:"calendar"},
  {key:"health",label:"System Health",icon:"report"},
  {key:"tasks",label:"Tasks",icon:"tasks"},
  {key:"notifications",label:"Notifications",icon:"bell"},
];

export default function AdminDashboard(){
  const {user}=useAuth(); const navigate=useNavigate(); const location=useLocation();
  const system=user?.role==="SYSTEM_ADMIN";
  const routeModule=location.pathname.startsWith("/admin/")?location.pathname.split("/")[2]:null;
  const [tab,setTab]=useState(system?"system":routeModule||"dashboard");
  const [permissions,setPermissions]=useState(system?["ALL"]:[]);
  const [loadingAccess,setLoadingAccess]=useState(!system); const [accessError,setAccessError]=useState(""); const [notificationCount,setNotificationCount]=useState(0);

  useEffect(()=>{if(system)return;let alive=true;api.adminAccessMe().then(x=>{if(alive)setPermissions(x?.permissions||[])}).catch(e=>alive&&setAccessError(e.message)).finally(()=>alive&&setLoadingAccess(false));return()=>{alive=false}},[system]);
  useEffect(()=>{api.unreadCount().then(r=>setNotificationCount(r?.count||0)).catch(()=>{})},[]);
  const has=key=>system||permissions.includes("ALL")||permissions.includes(key);
  const allowed=useMemo(()=>MODULES.filter(m=>has(m.permission)),[permissions,system]);
  const routeEntry=routeModule?MODULES.find(m=>m.key===routeModule):null;
  const routeDenied=!!routeModule && routeModule!=="notifications" && (!routeEntry || !has(routeEntry.permission));

  const select=(key)=>{setTab(key); if(!system && key!=="dashboard" && key!=="notifications") navigate(`/admin/${key}`); if(!system && key==="dashboard") navigate("/admin");};
  const title = system ? (SYSTEM_NAV.find(x=>x.key===tab)?.label || "Control Center") : (tab==="dashboard"?"HR Operations":allowed.find(x=>x.key===tab)?.label || "HR Operations");
  const subtitle = tab === "daily-reports"
    ? "Review daily work submissions, track team activities, and export records."
    : system
      ? "Govern organization policy, security, people and platform health."
      : "A focused, data-first workspace for people operations.";
  const nav = system ? SYSTEM_NAV : [{key:"dashboard",label:"Overview",icon:"home"},...allowed.map(m=>({key:m.key,label:m.label,icon:m.icon})),{key:"notifications",label:"Notifications",icon:"bell",badge:notificationCount||null}];
  const actions = !system ? [{label:"My Workspace",icon:"home",onClick:()=>navigate("/employee")}]:[];

  return <WorkspaceShell title={title} subtitle={subtitle} navItems={nav} active={tab} onNavigate={select} workspaceActions={actions}>
    <Suspense fallback={<LoadingCard text="Loading workspace module…"/>}>
    {system ? <SystemWorkspace tab={tab} setTab={setTab} navigate={navigate} notificationCount={notificationCount} setNotificationCount={setNotificationCount}/> : loadingAccess ? <LoadingCard text="Loading your delegated access…"/> : routeDenied ? <AccessDenied onBack={()=>select("dashboard")}/> : <>
      {accessError&&<div className="error-banner">Unable to load delegated access: {accessError}</div>}
      {tab==="dashboard"&&(has("REPORTS")?<AnalyticsDashboard/>:<DelegatedOverview permissions={permissions}/>)}
      {allowed.map(m=>{const Component=m.component; return tab===m.key?<Component key={m.key} adminMode/>:null;})}
      {tab==="notifications"&&<Notifications onCount={setNotificationCount}/>} 
    </>}
    </Suspense>
  </WorkspaceShell>;
}

function SystemWorkspace({tab,setTab,navigate,notificationCount,setNotificationCount}){
  const select=(key)=>{setTab(key); if(key==="notifications") return;};
  return <>
    {tab==="system"&&<SystemAdminPanel section="control"/>}
    {tab==="employees"&&<EmployeeList/>}
    {tab==="offices"&&<SystemAdminPanel section="offices"/>}
    {tab==="organization"&&<SystemAdminPanel section="organization"/>}
    {tab==="daily-reports"&&<DailyWorkReportsAdmin/>}
    {tab==="security"&&<SystemAdminPanel section="security"/>}
    {tab==="audit"&&<SystemAdminPanel section="audit"/>}
    {tab==="settings"&&<SystemAdminPanel section="settings"/>}
    {tab==="holidays"&&<SystemAdminPanel section="holidays"/>}
    {tab==="health"&&<SystemAdminPanel section="health"/>}
    {tab==="tasks"&&<Tasks adminMode systemAdminMode canBroadcastRoles/>}
    {tab==="notifications"&&<Notifications onCount={setNotificationCount}/>} 
  </>;
}

function DelegatedOverview({permissions}){
 const names={PEOPLE:'People',ATTENDANCE:'Attendance',LEAVE:'Leave Management',INVENTORY:'Inventory',TASKS:'Tasks',COMMUNICATION:'Announcements',REPORTS:'Reports & Analytics',OFFICE:'Office Locations',HOLIDAY_CALENDAR:'Holiday Calendar'};
 return <div className="premium-card access-home"><span className="eyebrow green">DELEGATED WORKSPACE</span><h2>Welcome to Daloft People</h2><p className="section-sub">Your Organization Admin has granted access only to the functions shown below. Analytics and reporting are available when the Reports & Analytics permission is granted.</p><div className="module-cards">{permissions.length?permissions.filter(p=>names[p]).map(p=><div className="module-card" key={p}><strong>{names[p]}</strong><span>Organization-wide access</span></div>):<div className="empty-state" style={{gridColumn:'1/-1'}}>No functional permissions are currently assigned. Contact the Organization Admin to request access.</div>}</div></div>}
function LoadingCard({text}){return <div className="premium-card loading-card"><div className="loading-spinner"/><strong>{text}</strong><span>Secure workspace access is being synchronized.</span></div>}
function AccessDenied({onBack}){return <div className="premium-card access-denied"><span className="eyebrow">SECURITY POLICY</span><h2>403 — Access denied</h2><p>You do not have permission to access this workspace module.</p><button className="btn btn-primary" onClick={onBack}>Back to overview</button></div>}
