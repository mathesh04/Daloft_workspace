import React,{useEffect,useState}from "react";
import api from "../api/api";
export default function Notifications({onCount}){
    const [items,setItems]=useState([]),[category,setCategory]=useState(""),[priority,setPriority]=useState(""),[unread,setUnread]=useState(false);
    const load=async()=>{const r=await api.myNotifications({category,priority,unreadOnly:unread||undefined});
    setItems(r||[]);
    const c=await api.unreadCount();
    onCount?.(c.count||0)};
    useEffect(()=>{load().catch(()=>{})},[category,priority,unread]);
    
    async function read(id){
        await api.readNotification(id);
        load()
    }
    
    async function all(){
        await api.readAllNotifications();
        load()
    }
    async function remove(id){
        await api.deleteNotification(id);
        load()
    }
    return <div className="prod-panel">
        <div className="analytics-heading">
            <div><h2>Notification Center</h2><p className="section-sub">Filter, prioritize and manage operational alerts.</p></div>
            <button className="btn btn-ghost" onClick={all}>Mark all read</button></div><div className="report-filters">
                <select value={category} onChange={e=>setCategory(e.target.value)}>
                    <option value="">All categories</option><option>INVENTORY</option>
                    <option>ATTENDANCE</option><option>LEAVE</option><option>TASK</option>
                    <option>SECURITY</option><option>SYSTEM</option></select>
                    <select value={priority} onChange={e=>setPriority(e.target.value)}>
                        <option value="">All priorities</option><option>LOW</option><option>MEDIUM</option>
                        <option>HIGH</option><option>CRITICAL</option></select><label><input type="checkbox" checked={unread} onChange={e=>setUnread(e.target.checked)}/> Unread only</label></div><div className="notification-list">{items.map(n=><div className={`notification-item ${n.readStatus?"":"unread"}`} key={n.id}><div className={`priority ${String(n.priority||"MEDIUM").toLowerCase()}`}/><div className="notification-body"><div className="notification-title"><b>{n.title}</b><span>{n.category||n.type} · {n.priority||"MEDIUM"}</span></div><p>{n.message}</p><small>{n.createdAt?new Date(n.createdAt).toLocaleString():""}</small></div><div className="notification-actions">{!n.readStatus&&<button onClick={()=>read(n.id)}>Read</button>}<button onClick={()=>remove(n.id)}>Delete</button></div></div>)}{!items.length&&<p className="muted">No notifications match the selected filters.</p>}</div></div>}
