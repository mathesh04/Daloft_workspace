import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const blank = (role) => ({ employeeId:"", name:"", password:"", role, department:"", designation:"", email:"", phoneNumber:"", address:"", emergencyContact:"", joiningDate:"" });

export default function EmployeeList(){
 const {user}=useAuth(); const system=user?.role==="SYSTEM_ADMIN";
 const [items,setItems]=useState([]),[departments,setDepartments]=useState([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[open,setOpen]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(blank(system?"HR_ADMIN":"EMPLOYEE")),[saving,setSaving]=useState(false);
 const title=system?"HR Administrators":"Employees"; const accountRole=system?"HR_ADMIN":"EMPLOYEE";
 async function load(){setLoading(true);setError("");try{const [people,deps]=await Promise.all([system?api.getHrAdmins():api.getEmployees(),api.adminDepartments().catch(()=>[])]);setItems(people);setDepartments(deps);}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[system]);
 function add(){setEditing(null);setForm({...blank(accountRole),department:departments[0]?.name||"Administration"});setOpen(true)}
 function edit(x){setEditing(x.id);setForm({employeeId:x.employeeId,name:x.name,password:"",role:x.role,department:x.department||"",designation:x.designation||"",email:x.email||"",phoneNumber:x.phoneNumber||"",address:x.address||"",emergencyContact:x.emergencyContact||"",joiningDate:x.joiningDate||""});setOpen(true)}
 async function save(e){e.preventDefault();setSaving(true);setError("");try{const payload={...form,role:accountRole};if(editing){system?await api.updateHrAdmin(editing,payload):await api.updateEmployee(editing,payload)}else{system?await api.createHrAdmin(payload):await api.createEmployee(payload)}setOpen(false);await load()}catch(e){setError(e.message)}finally{setSaving(false)}}
 async function toggle(x){try{system?await api.setHrAdminActive(x.id,!x.active):await api.setEmployeeActive(x.id,!x.active);await load()}catch(e){setError(e.message)}}
 async function archive(x){if(!window.confirm(`Archive ${x.name}? Login will be disabled and historical records will be preserved.`))return;try{await api.archiveEmployee(x.id);await load()}catch(e){setError(e.message)}}
 return <div>
  {error&&<div className="error-banner">{error}</div>}
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div className="stat-card" style={{padding:"10px 16px"}}><span className="stat-label">Total {title}</span><div className="stat-value" style={{fontSize:"1.4rem"}}>{items.length}</div></div><button className="btn btn-accent" onClick={add}>+ Add {system?"HR Admin":"employee"}</button></div>
  <div className="card"><div className="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Department</th><th>Status</th><th/></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.employeeId}</td><td>{x.name}</td><td><span className={`badge ${x.role==="HR_ADMIN"?"badge-admin":"badge-neutral"}`}>{x.role}</span></td><td>{x.department}</td><td><span className={`badge ${x.active?"badge-success":"badge-danger"}`}>{x.active?"Active":"Inactive"}</span></td><td><div style={{display:"flex",gap:6,justifyContent:"flex-end"}}><button className="btn btn-ghost btn-sm" onClick={()=>edit(x)}>Edit</button><button className="btn btn-ghost btn-sm" onClick={()=>toggle(x)}>{x.active?"Deactivate":"Activate"}</button>{!system&&<button className="btn btn-danger btn-sm" onClick={()=>archive(x)}>Archive</button>}</div></td></tr>)}{!loading&&!items.length&&<tr><td colSpan="6" className="empty-state">No {title.toLowerCase()} found.</td></tr>}</tbody></table></div></div>
    {open&&createPortal(<div className="modal-backdrop" onClick={()=>setOpen(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><h3>{editing?`Edit ${system?"HR Admin":"employee"}`:`Add ${system?"HR Admin":"employee"}`}</h3><button className="modal-close" onClick={()=>setOpen(false)}>×</button></div><form onSubmit={save}>
   <div className="form-row"><div className="field"><label>Employee ID</label><input value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})} disabled={!!editing} required/></div><div className="field"><label>Role</label><input value={accountRole} disabled/></div></div>
   <div className="field"><label>Full name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
   <div className="field"><label>Designation</label><input value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})} required placeholder={system?"HR Manager":"Java Developer"}/></div>
   <div className="field"><label>{editing?"New password (leave blank to keep current)":"Password"}</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required={!editing}/></div>
   <div className="form-row"><div className="field"><label>Department</label><select value={form.department} onChange={e=>setForm({...form,department:e.target.value})} required><option value="">Select department…</option>{departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}</select></div><div className="field"><label>Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div></div>
   <div className="form-row"><div className="field"><label>Phone</label><input value={form.phoneNumber} onChange={e=>setForm({...form,phoneNumber:e.target.value})}/></div><div className="field"><label>Joining date</label><input type="date" value={form.joiningDate} onChange={e=>setForm({...form,joiningDate:e.target.value})}/></div></div>
   <div className="field"><label>Emergency contact</label><input value={form.emergencyContact} onChange={e=>setForm({...form,emergencyContact:e.target.value})}/></div><div className="field"><label>Address</label><textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></div>
   <button className="btn btn-primary" type="submit" style={{width:"100%",marginTop:6}} disabled={saving}>{saving?"Saving…":editing?"Save changes":system?"Create HR Admin":"Create employee"}</button>
    </form></div></div>, document.body)}
 </div>
}