import React,{useEffect,useMemo,useState}from 'react';
import {useAuth} from '../context/AuthContext';
import api from '../api/api';
import {TaskBadge} from './StatusBadges';

const empty={title:'',description:'',assignedTo:'',department:'',targetRole:'',dueDate:''};

export default function Tasks({managerMode=false,adminMode=false,systemAdminMode=false,canBroadcastRoles=false}){
 const {user}=useAuth();
 const [tasks,setTasks]=useState([]),[employees,setEmployees]=useState([]),[departments,setDepartments]=useState([]),[form,setForm]=useState(empty);
 const [mode,setMode]=useState(managerMode?'employee':'employee'),[error,setError]=useState(''),[saving,setSaving]=useState(false),[loading,setLoading]=useState(true);
 const [page, setPage] = useState(0);
 const PAGE_SIZE = 10;
 useEffect(() => { setPage(0); }, [tasks.length]);
 const pages = Math.ceil(tasks.length / PAGE_SIZE);
 const currentTasks = tasks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
 const roleBroadcastAllowed=canBroadcastRoles||systemAdminMode||user?.role==='SYSTEM_ADMIN'||(user?.role==='HR_ADMIN'&&user?.permissions?.includes('ALL'));
 const load=async()=>{
  setLoading(true);setError('');
  try{
   const results=managerMode
    ? await Promise.allSettled([api.managerTasks(),api.managerTaskTargets()])
    : systemAdminMode
      ? await Promise.allSettled([api.systemAdminTasks(),api.systemAdminTaskTargets()])
      : await Promise.allSettled([api.allTasks(),api.adminTaskTargets()]);
   if(managerMode){
    const tasksVal=results[0].status==='fulfilled'?results[0].value:[];
    const targets=results[1].status==='fulfilled'?(results[1].value||{}):{};
    const teamVal=Array.isArray(targets.employees)?targets.employees:[];
    const depsVal=Array.isArray(targets.departments)?targets.departments:[];
    setTasks(Array.isArray(tasksVal)?tasksVal:[]);
    setEmployees(teamVal.filter(x=>x && x.active !== false));
    setDepartments(depsVal.filter(x=>x&&x.active!==false));
   }else{
    const tasksVal=results[0].status==='fulfilled'?results[0].value:[];
    const targets=results[1].status==='fulfilled'?(results[1].value||{}):{};
    setTasks(Array.isArray(tasksVal)?tasksVal:[]);setEmployees(Array.isArray(targets.employees)?targets.employees.filter(x=>x && x.active !== false):[]);setDepartments(Array.isArray(targets.departments)?targets.departments.filter(x=>x && x.active !== false):[]);
   }
   const failed=results.filter(r=>r.status==='rejected');
   if(failed.length){
    const targetFailure=results[1]?.status==='rejected';
    setError(targetFailure
      ? (results[1].reason?.message||'Task recipients could not be loaded. Please verify your task permission and try again.')
      : 'Task records could not be loaded. Please refresh and try again.');
   }
  }catch(e){setError(e.message||'Unable to load tasks.')}finally{setLoading(false)}
 };
 useEffect(()=>{load()},[managerMode]);
 const roleOptions=useMemo(()=>['EMPLOYEE','MANAGER','HR_ADMIN'].filter(r=>employees.some(e=>e.role===r&&e.active)),[employees]);
 const submit=async ev=>{
  ev.preventDefault();setSaving(true);setError('');
  try{
   const payload={...form,assignmentMode:mode,assignedTo:mode==='employee'?form.assignedTo:'',department:mode==='department'?form.department:'',targetRole:mode==='role'?form.targetRole:''};
   if(mode==='all')delete payload.targetRole;
   managerMode
     ? await api.createManagerTask(payload)
     : systemAdminMode
       ? await api.createSystemAdminTask(payload)
       : await api.createTask(payload);
   setForm(empty);await load();
  }catch(e){setError(e.message||'Unable to assign task.')}finally{setSaving(false)}
 };
 const updateStatus=async(id,status)=>{try{await api.updateManagerTaskStatus(id,status);setTasks(ts=>ts.map(t=>t.id===id?{...t,status}:t));}catch(e){setError(e.message||'Unable to update task status.')}};
 return <div>
  {error&&<div className="error-banner">{error}</div>}
  {loading?<div className="card dashboard-loading"><div className="loading-spinner"/>Loading tasks…</div>:<div className="task-workspace-grid">
   <div className="card"><div className="card-title-row"><div><h3>{managerMode?'Assign team task':'Assign a task'}</h3><p className="section-sub">{managerMode?'Assign work only to people and departments under your responsibility.':'Choose an individual, department, role group, or all active non-system users.'}</p></div></div>
    <form onSubmit={submit}>
     <div className="field"><label>Title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required maxLength={160}/></div>
     <div className="field"><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} maxLength={2000}/></div>
     <div className="field"><label>Assignment</label><select value={mode} onChange={e=>setMode(e.target.value)}>
       <option value="employee">One employee</option>
       <option value="department">Everyone in a department</option>
       {roleBroadcastAllowed&&!managerMode&&<><option value="role">Everyone with a role</option><option value="all">All active employees, managers and HR admins</option></>}
     </select></div>
     {mode==='department'&&<div className="field"><label>Department</label><select value={form.department} onChange={e=>setForm({...form,department:e.target.value})} required><option value="">Select department…</option>{departments.map(d=><option key={d.id||d.name} value={d.name}>{d.name}</option>)}</select></div>}
     {mode==='role'&&<div className="field"><label>Target role</label><select value={form.targetRole} onChange={e=>setForm({...form,targetRole:e.target.value})} required><option value="">Select role…</option>{roleOptions.map(r=><option key={r} value={r}>{r.replaceAll('_',' ')}</option>)}</select></div>}
     {mode==='employee'&&<div className="field"><label>Assign to {employees.length ? `(${employees.length} available)` : ""}</label><select value={form.assignedTo} onChange={e=>setForm({...form,assignedTo:e.target.value})} required><option value="">Select employee…</option>{employees.map(e=><option key={e.employeeId||e.id} value={e.employeeId}>{e.name||e.employeeId} · {e.employeeId} · {e.role||'EMPLOYEE'}</option>)}</select>{!employees.length&&<div className="field-help">{managerMode?'No active employees are currently under your responsibility.':'No active employees are available for task assignment.'}</div>}</div>}
     {mode==='all'&&<div className="selection-summary"><b>Broadcast task</b><span>All active EMPLOYEE, MANAGER and HR ADMIN accounts will receive this task. The assigning Organization Admin is excluded.</span></div>}
     <div className="field"><label>Due date</label><input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></div>
     <button className="btn btn-accent" style={{width:'100%'}} disabled={saving}>{saving?'Assigning…':mode==='all'?'Assign to everyone':'Assign task'}</button>
    </form>
   </div>
   <div className="card"><div className="card-title-row"><div><h3>{managerMode?'Team tasks':'Organization tasks'}</h3><p className="section-sub">{tasks.length} task{tasks.length===1?'':'s'} loaded.</p></div><button className="btn btn-ghost" onClick={load}>↻ Refresh</button></div>
    <div className="table-wrap"><table><thead><tr><th>Title</th><th>Assigned to</th><th>Due</th><th>Status</th></tr></thead><tbody>{currentTasks.map(t=><tr key={t.id}>
     <td><b>{t.title}</b><div className="muted">{t.assignmentType==='DEPARTMENT'?`Department: ${t.targetDepartment}`:t.assignmentType==='ROLE'?`Role: ${t.targetRole?.replaceAll('_',' ')||'—'}`:t.assignmentType==='ROLE_GROUP'?'Everyone (non-system users)':''}</div></td>
     <td>{t.assignedTo?.name||'—'} <span className="muted">{t.assignedTo?.employeeId?`(${t.assignedTo.employeeId})`:''}</span></td>
     <td>{t.dueDate||'—'}</td>
     <td>{managerMode?<select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)}><option value="PENDING">PENDING</option><option value="IN_PROGRESS">IN PROGRESS</option><option value="COMPLETED">COMPLETED</option></select>:<TaskBadge status={t.status}/>}</td>
    </tr>)}{!tasks.length&&<tr><td colSpan="4" className="empty-state">No tasks yet.</td></tr>}</tbody></table></div>
    {pages > 1 && (
      <div className="pagination" style={{ padding: "14px 18px", borderTop: "1px solid var(--border, #edf2ee)" }}>
        <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, tasks.length)} of {tasks.length} tasks (Page {page + 1} of {pages})</span>
        <div style={{ display: "flex", gap: "6px" }}>
          <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>← Previous</button>
          <button className="btn btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => setPage(p => Math.min(pages - 1, p + 1))}>Next →</button>
        </div>
      </div>
    )}
   </div>
  </div>}
 </div>;
}
