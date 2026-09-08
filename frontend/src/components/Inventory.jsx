import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const EMPTY_COMPONENT = {
  name: "", componentCode: "", categoryId: "", manufacturer: "", modelNumber: "",
  description: "", unit: "pcs", currentQuantity: 0, minimumQuantity: 0, storageLocation: ""
};
const EMPTY_CATEGORY = { name: "", description: "" };

function Modal({ title, children, onClose, wide = false }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true">
      <div className="modal-header"><h3>{title}</h3><button className="modal-close" onClick={onClose} aria-label="Close">×</button></div>
      {children}
    </div>
  </div>;
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return <div className={`toast toast-${toast.type}`} role="status">
    <span>{toast.type === "success" ? "✓" : "!"}</span><div><strong>{toast.title}</strong><div>{toast.message}</div></div>
    <button onClick={onClose} aria-label="Dismiss">×</button>
  </div>;
}

function ConfirmDialog({ title, message, confirmText = "Confirm", danger = false, onCancel, onConfirm }) {
  return <Modal title={title} onClose={onCancel}>
    <p className="confirm-copy">{message}</p>
    <div className="modal-actions"><button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      <button className={`btn ${danger ? "btn-danger-solid" : "btn-primary"}`} onClick={onConfirm}>{confirmText}</button></div>
  </Modal>;
}

function StatusBadge({ value }) {
  const cls = value === "APPROVED" || value === "IN_USE" || value === "RETURNED" || value === "IN_STOCK" ? "badge-success"
    : value === "REJECTED" || value === "DAMAGED" ? "badge-danger"
    : value === "PENDING" || value === "RETURN_REQUESTED" || value === "LOW_STOCK" ? "badge-warning"
    : value === "OUT_OF_STOCK" ? "badge-danger" : "badge-neutral";
  return <span className={`badge ${cls}`}>{String(value || "").replaceAll("_", " ")}</span>;
}

function Stat({ label, value, hint, tone = "" }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-label">{label}</div><div className="stat-value">{value ?? 0}</div>{hint && <div className="stat-hint">{hint}</div>}</div>;
}

function SearchBar({ value, onChange, placeholder }) {
  return <div className="search-box"><span>⌕</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return <div className="pagination"><span>Page {page + 1} of {pages}</span>
    <div><button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>← Previous</button>
      <button className="btn btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next →</button></div></div>;
}

function BarList({ data, max, formatter = x => x }) {
  if (!data?.length) return <div className="empty-state">No data available yet.</div>;
  return <div className="bar-list">{data.map((x, i) => {
    const value = Number(x.quantity ?? x.value ?? 0);
    const share = Math.round((value / Math.max(max, 1)) * 100);
    return <div className="bar-row" key={x.name || x.label || i}><div className="bar-label"><span title={x.name || x.label}>{x.name || x.label}</span><b>{formatter(value)}</b></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(value ? 4 : 0, Math.min(100, share))}%` }} /></div></div>;
  })}</div>;
}

function MonthlyChart({ data }) {
  const rows = data || [];
  const max = Math.max(...rows.flatMap(x => [Number(x.in || 0), Number(x.out || 0)]), 1);
  const totalIn = rows.reduce((sum, row) => sum + Number(row.in || 0), 0);
  const totalOut = rows.reduce((sum, row) => sum + Number(row.out || 0), 0);
  const hasMovement = totalIn > 0 || totalOut > 0;
  return <div className="inventory-movement-chart">
    <div className="movement-summary" aria-label="Movement totals"><div><span>Received</span><b>{totalIn.toLocaleString()}</b><small>units IN</small></div><div><span>Issued</span><b>{totalOut.toLocaleString()}</b><small>units OUT</small></div><div className={totalIn - totalOut < 0 ? "negative" : "positive"}><span>Net movement</span><b>{(totalIn - totalOut).toLocaleString()}</b><small>six-month balance</small></div></div>
    <div className={`movement-plot ${hasMovement ? "" : "no-movement"}`}><div className="movement-scale"><span>{max}</span><span>{Math.round(max/2)}</span><span>0</span></div>
    <div className="monthly-chart">{rows.map(x => <div className="month-column" key={x.month} aria-label={`${x.month || "Unknown month"}: ${x.in || 0} received, ${x.out || 0} issued`}>
      <div className="month-bars"><div className={`month-bar in ${Number(x.in || 0) ? "has-value" : ""}`} style={{ height: `${Number(x.in || 0) ? Math.max(5, Number(x.in || 0) / max * 100) : 0}%`, minHeight: Number(x.in || 0) ? "4px" : "0" }} title={`Stock IN: ${x.in || 0}`} />
      <div className={`month-bar out ${Number(x.out || 0) ? "has-value" : ""}`} style={{ height: `${Number(x.out || 0) ? Math.max(5, Number(x.out || 0) / max * 100) : 0}%`, minHeight: Number(x.out || 0) ? "4px" : "0" }} title={`Stock OUT: ${x.out || 0}`} /></div>
      <small>{x.month ? x.month.slice(5) : "—"}</small><div className="month-values"><b>{x.in || 0}</b><span>{x.out || 0}</span></div></div>)}</div>
    {!rows.length && <div className="empty-state">No stock movement data available yet.</div>}{!hasMovement && rows.length > 0 && <div className="movement-empty"><strong>No movement recorded</strong><span>There were no receipts or issues in the selected period.</span></div>}</div>
  </div>;
}

export default function Inventory() {
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState(null), [analytics, setAnalytics] = useState(null);
  const [cats, setCats] = useState([]), [items, setItems] = useState([]), [tx, setTx] = useState([]);
  const [requests, setRequests] = useState([]), [usage, setUsage] = useState([]), [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [toast, setToast] = useState(null), [modal, setModal] = useState(null), [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(""), [stockFilter, setStockFilter] = useState(""), [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(0);

  const notify = (title, message, type = "success") => { setToast({ title, message, type }); window.setTimeout(() => setToast(null), 3500); };
  const load = async () => {
    try {
      setLoading(true); setError("");
      const results = await Promise.allSettled([
        api.inventoryDashboard(), api.inventoryAnalytics(), api.getInventoryCategories(), api.getComponents(),
        api.getStockTransactions(), api.getInventoryRequests(), api.getInventoryUsageUpdates(), api.inventoryAuditLogs()
      ]);
      const value = (index, fallback) => results[index].status === "fulfilled" ? results[index].value : fallback;
      setData(value(0, {})); setAnalytics(value(1, {})); setCats(value(2, [])); setItems(value(3, []));
      setTx(value(4, [])); setRequests(value(5, [])); setUsage(value(6, [])); setAudit(value(7, []));
      const failed = results.filter(result => result.status === "rejected");
      if (failed.length) setError(failed.length === results.length ? "Unable to load the inventory workspace." : "Some inventory sections are temporarily unavailable. Available data is still shown.");
    } catch (e) { setError(e.message || "Unable to load inventory"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const locations = useMemo(() => [...new Set(items.map(i => i.storageLocation).filter(Boolean))].sort(), [items]);
  const filteredItems = useMemo(() => items.filter(i => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [i.name,i.componentCode,i.manufacturer,i.modelNumber,i.storageLocation,i.category?.name].some(v => String(v || "").toLowerCase().includes(q));
    const matchesCat = !categoryFilter || String(i.category?.id) === categoryFilter || i.category?.name === categoryFilter;
    const current = Number(i.currentQuantity || 0), minimum = Number(i.minimumQuantity || 0);
    const status = current === 0 ? "OUT" : current <= minimum ? "LOW" : "IN";
    return matchesSearch && matchesCat && (!stockFilter || status === stockFilter) && (!locationFilter || i.storageLocation === locationFilter);
  }), [items, search, categoryFilter, stockFilter, locationFilter]);
  const pageSize = 8, pages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => { setPage(0); }, [search, categoryFilter, stockFilter, locationFilter]);

  const submitCategory = async e => {
    e.preventDefault(); setBusy(true);
    try { await api.createInventoryCategory(modal.form); setModal(null); notify("Category created","The inventory category is ready to use."); await load(); }
    catch(e){setError(e.message)} finally{setBusy(false)}
  };
  const saveCategory = async e => {
    e.preventDefault(); setBusy(true);
    try { await api.updateInventoryCategory(modal.id, modal.form); setModal(null); notify("Category updated","Changes saved."); await load(); }
    catch(e){setError(e.message)} finally{setBusy(false)}
  };
  const saveComponent = async e => {
    e.preventDefault();
    const f = modal.form;
    if (!f.name.trim() || !f.componentCode.trim() || !f.categoryId) return setError("Name, component code and category are required.");
    if (Number(f.currentQuantity) < 0 || Number(f.minimumQuantity) < 0) return setError("Quantities cannot be negative.");
    setBusy(true);
    try {
      const payload = {...f, categoryId:Number(f.categoryId), currentQuantity:Number(f.currentQuantity), minimumQuantity:Number(f.minimumQuantity)};
      if (modal.id) await api.updateComponent(modal.id, payload); else await api.createComponent(payload);
      setModal(null); notify(modal.id ? "Component updated" : "Component added", `${f.name} was saved successfully.`); await load();
    } catch(e){setError(e.message)} finally{setBusy(false)}
  };
  const changeStock = async e => {
    e.preventDefault(); const f=modal.form;
    if (Number(f.quantity) <= 0) return setError("Quantity must be greater than zero.");
    if (f.type === "OUT" && Number(f.quantity) > Number(modal.item.currentQuantity)) return setError(`Only ${modal.item.currentQuantity} units are available.`);
    setBusy(true);
    try { await api.updateStock(modal.item.id,{type:f.type,quantity:Number(f.quantity),purpose:f.purpose}); setModal(null); notify(`Stock ${f.type === "IN" ? "received" : "issued"}`, `${modal.item.name}: ${f.quantity} ${modal.item.unit || "units"}.`); await load(); }
    catch(e){setError(e.message)} finally{setBusy(false)}
  };
  const deleteComponent = async () => {
    setBusy(true); try { await api.deleteComponent(modal.item.id); setModal(null); notify("Component deleted","The component was removed."); await load(); }
    catch(e){setError(e.message)} finally{setBusy(false)}
  };
  const reviewRequest = async approved => {
    const f=modal.form; setBusy(true);
    try { await api.reviewInventoryRequest(modal.request.id,{approved,remark:f.remark}); setModal(null); notify(approved ? "Request approved":"Request rejected", `Request #${modal.request.id} has been processed.`); await load(); }
    catch(e){setError(e.message)} finally{setBusy(false)}
  };
  const reviewReturn = async approved => {
    setBusy(true); try { await api.reviewInventoryUsage(modal.usage.id,{approved}); setModal(null); notify(approved ? "Return approved":"Return marked damaged", "The asset status and stock have been updated."); await load(); }
    catch(e){setError(e.message)} finally{setBusy(false)}
  };

  if (loading) return <div className="card"><div className="loading-row"><span className="spinner" /> Loading inventory workspace…</div></div>;

  const pendingRequests = requests.filter(r=>r.status==="PENDING").length;
  const returnRequests = usage.filter(u=>u.usageStatus==="RETURN_REQUESTED").length;

  return <div className="inventory-workspace">
    <Toast toast={toast} onClose={()=>setToast(null)} />
    {error && <div className="error-banner"><span>{error}</span><button onClick={()=>setError("")}>×</button></div>}
    <div className="inventory-head"><div><h2 className="section-title">Inventory Management</h2><p className="section-sub">Track hardware, requests, stock movement and employee assets from one workspace.</p></div>
      <div className="head-actions"><button className="btn btn-ghost" onClick={load}>↻ Refresh</button><button className="btn btn-accent" onClick={()=>setModal({type:"component",form:{...EMPTY_COMPONENT}})}>＋ Add component</button></div>
    </div>

    <div className="tabs">{[
      ["dashboard","Overview"],["categories","Categories"],["components","Components"],["stock","Stock control"],
      ["history","Transactions"],["requests",`Requests${pendingRequests ? ` (${pendingRequests})`:""}`],["usage",`Assets${returnRequests ? ` (${returnRequests})`:""}`],["audit","Audit log"],["reports","Reports"]
    ].map(([k,l])=><button key={k} className={`tab-btn ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>)}</div>

    {tab==="dashboard" && <Dashboard data={data} analytics={analytics} pendingRequests={pendingRequests} returnRequests={returnRequests} onTab={setTab} />}
    {tab==="categories" && <Categories cats={cats} onAdd={()=>setModal({type:"category",form:{...EMPTY_CATEGORY}})} onEdit={c=>setModal({type:"category-edit",id:c.id,form:{name:c.name,description:c.description||""}})} />}
    {(tab==="components" || tab==="stock") && <Components items={visibleItems} total={filteredItems.length} search={search} setSearch={setSearch}
      cats={cats} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} stockFilter={stockFilter} setStockFilter={setStockFilter}
      locationFilter={locationFilter} setLocationFilter={setLocationFilter} locations={locations} page={page} pages={pages} setPage={setPage}
      showActions={tab==="components"} onAdd={()=>setModal({type:"component",form:{...EMPTY_COMPONENT}})}
      onEdit={i=>setModal({type:"component",id:i.id,form:{name:i.name,componentCode:i.componentCode,categoryId:i.category?.id||"",manufacturer:i.manufacturer||"",modelNumber:i.modelNumber||"",description:i.description||"",unit:i.unit||"pcs",currentQuantity:i.currentQuantity||0,minimumQuantity:i.minimumQuantity||0,storageLocation:i.storageLocation||""}})}
      onStock={i=>setModal({type:"stock",item:i,form:{type:"IN",quantity:1,purpose:""}})}
      onDelete={i=>setModal({type:"confirm-delete",item:i})} />}
    {tab==="history" && <TransactionTable tx={tx} />}
    {tab==="requests" && <RequestTable requests={requests} onReview={r=>setModal({type:"request-review",request:r,form:{remark:""}})} />}
    {tab==="usage" && <UsageTable usage={usage} onReview={u=>setModal({type:"return-review",usage:u})} />}
    {tab==="audit" && <AuditTable audit={audit} />}
    {tab==="reports" && <Reports onDone={(t,m)=>notify(t,m)} />}

    {modal?.type==="category" && <Modal title="Add inventory category" onClose={()=>setModal(null)}><CategoryForm form={modal.form} setForm={f=>setModal({...modal,form:f})} onSubmit={submitCategory} busy={busy} onCancel={()=>setModal(null)} /></Modal>}
    {modal?.type==="category-edit" && <Modal title="Edit inventory category" onClose={()=>setModal(null)}><CategoryForm form={modal.form} setForm={f=>setModal({...modal,form:f})} onSubmit={saveCategory} busy={busy} onCancel={()=>setModal(null)} /></Modal>}
    {modal?.type==="component" && <Modal title={modal.id ? "Edit hardware component" : "Add hardware component"} onClose={()=>setModal(null)} wide><ComponentForm form={modal.form} setForm={f=>setModal({...modal,form:f})} cats={cats} onSubmit={saveComponent} busy={busy} editing={!!modal.id} onCancel={()=>setModal(null)}/></Modal>}
    {modal?.type==="stock" && <Modal title={`${modal.form.type==="IN" ? "Stock IN" : "Stock OUT"} · ${modal.item.name}`} onClose={()=>setModal(null)}><StockForm modal={modal} setModal={setModal} onSubmit={changeStock} busy={busy} /></Modal>}
    {modal?.type==="confirm-delete" && <ConfirmDialog title="Delete component" message={`Are you sure you want to delete "${modal.item.name}"? This cannot be undone.`} confirmText="Delete component" danger onCancel={()=>setModal(null)} onConfirm={deleteComponent} />}
    {modal?.type==="request-review" && <Modal title={`Review request #${modal.request.id}`} onClose={()=>setModal(null)}><div className="review-summary"><b>{modal.request.component.name}</b><span>{modal.request.quantity} units · {modal.request.employee.name}</span><span>{modal.request.purpose || "No purpose provided"}</span></div>
      <div className="field"><label>Admin remark</label><textarea value={modal.form.remark} onChange={e=>setModal({...modal,form:{remark:e.target.value}})} placeholder="Optional note for the employee" /></div>
      <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-danger" disabled={busy} onClick={()=>reviewRequest(false)}>Reject</button><button className="btn btn-accent" disabled={busy} onClick={()=>reviewRequest(true)}>Approve</button></div></Modal>}
    {modal?.type==="return-review" && <Modal title="Review asset return" onClose={()=>setModal(null)}><div className="review-summary"><b>{modal.usage.component.name}</b><span>{modal.usage.quantity} units · {modal.usage.employee.name}</span><span>{modal.usage.notes || "No return note provided"}</span></div>
      <div className="modal-actions"><button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-danger" disabled={busy} onClick={()=>reviewReturn(false)}>Mark damaged</button><button className="btn btn-accent" disabled={busy} onClick={()=>reviewReturn(true)}>Approve return</button></div></Modal>}
  </div>;
}

function Dashboard({data,analytics,pendingRequests,returnRequests,onTab}) {
  const category = Object.entries(analytics?.categoryStock || {}).map(([name,quantity])=>({name,quantity}));
  const maxCat=Math.max(...category.map(x=>x.quantity),1);
  return <div className="dashboard-stack">
    <div className="grid grid-4"><Stat label="Components" value={data?.totalComponents} hint="Unique hardware SKUs" /><Stat label="Total units" value={data?.totalStock} hint="Across all locations" /><Stat label="Low stock" value={data?.lowStockItems} hint={data?.totalComponents ? `${Math.round((data.lowStockItems / data.totalComponents) * 100)}% of components` : "At or below minimum"} tone="warning" /><Stat label="Pending actions" value={pendingRequests+returnRequests} hint={`${pendingRequests} requests · ${returnRequests} returns`} tone="accent" /></div>
    <div className="grid grid-2 inventory-chart-grid">
      <div className="card chart-card inventory-category-card"><div className="card-title-row"><div><span className="chart-kicker">CURRENT HOLDINGS</span><h3>Stock by category</h3><p>Where your available units are concentrated.</p></div><span className="chart-unit">UNITS</span></div><BarList data={category} max={maxCat} /></div>
      <div className="card chart-card inventory-movement-card"><div className="card-title-row"><div><span className="chart-kicker">LAST SIX MONTHS</span><h3>Stock movement</h3><p>Compare receipts with issues before replenishing.</p></div><div className="legend"><span>Received</span><span>Issued</span></div></div><MonthlyChart data={analytics?.monthlyUsage} /></div>
    </div>
    <div className="grid grid-2">
      <div className="card chart-card"><h3>Top used components</h3><p className="chart-sub">Highest stock-out volume.</p><BarList data={analytics?.topUsed} max={Math.max(...(analytics?.topUsed||[]).map(x=>x.quantity),1)} formatter={x=>`${x} units`} /></div>
      <div className="card"><div className="card-title-row"><div><h3>Needs attention</h3><p>Low-stock items that may need replenishment.</p></div><button className="btn btn-ghost btn-sm" onClick={()=>onTab("stock")}>Open stock</button></div>
        {data?.lowStockComponents?.length ? <div className="attention-list">{data.lowStockComponents.slice(0,6).map(i=><div className="attention-row" key={i.id}><div><b>{i.name}</b><span>{i.componentCode}</span></div><strong>{i.currentQuantity} / {i.minimumQuantity}</strong></div>)}</div> : <div className="empty-state">All components are above minimum stock.</div>}
      </div>
    </div>
    <div className="card"><div className="card-title-row"><div><h3>Recent activity</h3><p>Latest stock movements.</p></div><button className="btn btn-ghost btn-sm" onClick={()=>onTab("history")}>View all</button></div>
      <div className="activity-list">{(data?.recentTransactions||[]).slice(0,6).map(t=><div className="activity-row" key={t.id}><span className={`activity-dot ${t.transactionType==="IN"?"dot-in":"dot-out"}`} /><div><b>{t.component?.name}</b><span>{t.transactionType==="IN"?"Stock received":"Stock issued"} · {t.quantity} units</span></div><time>{new Date(t.transactionDate).toLocaleString()}</time></div>)}</div>
    </div>
  </div>;
}

function Categories({cats,onAdd,onEdit}) {
  return <div className="card"><div className="card-title-row"><div><h3>Inventory categories</h3><p>Organise hardware into reusable categories.</p></div><button className="btn btn-accent" onClick={onAdd}>＋ Add category</button></div>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Description</th><th>Action</th></tr></thead><tbody>{cats.map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.description||"—"}</td><td><button className="btn btn-ghost btn-sm" onClick={()=>onEdit(c)}>Edit</button></td></tr>)}{!cats.length&&<tr><td colSpan="3" className="empty-state">No categories yet.</td></tr>}</tbody></table></div>
  </div>;
}

function Components({items,total,search,setSearch,cats,categoryFilter,setCategoryFilter,stockFilter,setStockFilter,locationFilter,setLocationFilter,locations,page,pages,setPage,showActions,onAdd,onEdit,onStock,onDelete}) {
  return <div className="card"><div className="card-title-row"><div><h3>{showActions?"Hardware components":"Stock control"}</h3><p>{total} matching components.</p></div>{showActions&&<button className="btn btn-accent" onClick={onAdd}>＋ Add component</button>}</div>
    <div className="filter-panel"><SearchBar value={search} onChange={setSearch} placeholder="Search name, code, manufacturer, location…" />
      <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="">All categories</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={stockFilter} onChange={e=>setStockFilter(e.target.value)}><option value="">All stock</option><option value="IN">In stock</option><option value="LOW">Low stock</option><option value="OUT">Out of stock</option></select>
      <select value={locationFilter} onChange={e=>setLocationFilter(e.target.value)}><option value="">All locations</option>{locations.map(l=><option key={l}>{l}</option>)}</select>
      {(search||categoryFilter||stockFilter||locationFilter)&&<button className="btn btn-ghost btn-sm" onClick={()=>{setSearch("");setCategoryFilter("");setStockFilter("");setLocationFilter("")}}>Reset</button>}
    </div>
    <div className="table-wrap"><table><thead><tr><th>Code</th><th>Component</th><th>Category</th><th>Stock</th><th>Minimum</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{items.map(i=>{const status=i.currentQuantity===0?"OUT":i.currentQuantity<=i.minimumQuantity?"LOW":"OK";return <tr key={i.id}><td><span className="code-chip">{i.componentCode}</span></td><td><b>{i.name}</b><small>{i.manufacturer||"No manufacturer"}</small></td><td>{i.category?.name||"—"}</td><td><b>{i.currentQuantity}</b> {i.unit||"pcs"}</td><td>{i.minimumQuantity}</td><td>{i.storageLocation||"—"}</td><td><StatusBadge value={status==="OK"?"IN_STOCK":status==="LOW"?"LOW_STOCK":"OUT_OF_STOCK"} /></td>
        <td><div className="action-row"><button className="btn btn-ghost btn-sm" onClick={()=>onStock(i)}>Stock</button>{showActions&&<><button className="btn btn-ghost btn-sm" onClick={()=>onEdit(i)}>Edit</button><button className="btn btn-danger btn-sm" onClick={()=>onDelete(i)}>Delete</button></>}</div></td></tr>})}
        {!items.length&&<tr><td colSpan="8" className="empty-state">No components match your filters.</td></tr>}</tbody></table></div>
    <Pagination page={page} pages={pages} onPage={setPage} />
  </div>;
}

function CategoryForm({form,setForm,onSubmit,busy,onCancel}) {
  return <form onSubmit={onSubmit}><div className="field"><label>Name *</label><input required maxLength="100" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Sensors" /></div>
    <div className="field"><label>Description</label><textarea maxLength="500" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="What belongs in this category?" /></div>
    <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button><button disabled={busy} className="btn btn-accent">{busy?"Saving…":"Save category"}</button></div></form>;
}

function ComponentForm({form,setForm,cats,onSubmit,busy,editing,onCancel}) {
  const set=(k,v)=>setForm({...form,[k]:v});
  return <form onSubmit={onSubmit}><div className="form-grid">
    <div className="field"><label>Component name *</label><input required value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Raspberry Pi 5" /></div>
    <div className="field"><label>Component code *</label><input required value={form.componentCode} onChange={e=>set("componentCode",e.target.value.toUpperCase())} placeholder="RPI-005" /></div>
    <div className="field"><label>Category *</label><select required value={form.categoryId} onChange={e=>set("categoryId",e.target.value)}><option value="">Select category</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
    <div className="field"><label>Manufacturer</label><input value={form.manufacturer} onChange={e=>set("manufacturer",e.target.value)} placeholder="Raspberry Pi Foundation" /></div>
    <div className="field"><label>Model number</label><input value={form.modelNumber} onChange={e=>set("modelNumber",e.target.value)} /></div>
    <div className="field"><label>Unit</label><input value={form.unit} onChange={e=>set("unit",e.target.value)} placeholder="pcs" /></div>
    <div className="field"><label>{editing?"Current quantity":"Initial quantity"}</label><input type="number" min="0" step="1" readOnly={editing} value={form.currentQuantity} onChange={e=>set("currentQuantity",e.target.value)} aria-describedby={editing ? "quantity-note" : undefined} />{editing&&<small id="quantity-note" className="field-note">Use Stock IN or Stock OUT to adjust inventory.</small>}</div>
    <div className="field"><label>Minimum quantity</label><input type="number" min="0" step="1" value={form.minimumQuantity} onChange={e=>set("minimumQuantity",e.target.value)} /></div>
    <div className="field"><label>Storage location</label><input value={form.storageLocation} onChange={e=>set("storageLocation",e.target.value)} placeholder="Drone Lab / Rack A" /></div>
  </div>
  <div className="field"><label>Description</label><textarea value={form.description} onChange={e=>set("description",e.target.value)} /></div>
  <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button><button disabled={busy} className="btn btn-accent">{busy?"Saving…":editing?"Save changes":"Add component"}</button></div></form>;
}

function StockForm({modal,setModal,onSubmit,busy}) {
  const f=modal.form, set=(k,v)=>setModal({...modal,form:{...f,[k]:v}});
  return <form onSubmit={onSubmit}><div className="stock-switch"><button type="button" className={f.type==="IN"?"selected":""} onClick={()=>set("type","IN")}>＋ Stock IN</button><button type="button" className={f.type==="OUT"?"selected danger":""} onClick={()=>set("type","OUT")}>− Stock OUT</button></div>
    <div className="stock-available">Current stock <strong>{modal.item.currentQuantity} {modal.item.unit||"pcs"}</strong></div>
    <div className="field"><label>Quantity *</label><input autoFocus type="number" min="1" step="1" max={f.type==="OUT"?modal.item.currentQuantity:undefined} required value={f.quantity} onChange={e=>set("quantity",e.target.value)} /></div>
    <div className="field"><label>Purpose / note</label><textarea value={f.purpose} onChange={e=>set("purpose",e.target.value)} placeholder="Purchase receipt, project issue, adjustment…" /></div>
    <div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button><button disabled={busy} className="btn btn-accent">{busy?"Updating…":"Update stock"}</button></div></form>;
}

function TransactionTable({tx}) {
  return <div className="card"><div className="card-title-row"><div><h3>Transaction history</h3><p>Every manual and approved stock movement.</p></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Component</th><th>Type</th><th>Quantity</th><th>Purpose</th><th>Created by</th></tr></thead><tbody>{tx.map(t=><tr key={t.id}><td>{new Date(t.transactionDate).toLocaleString()}</td><td><b>{t.component?.name}</b><small>{t.component?.componentCode}</small></td><td><span className={`movement movement-${t.transactionType.toLowerCase()}`}>{t.transactionType==="IN"?"＋":"−"} {t.transactionType}</span></td><td>{t.quantity}</td><td>{t.purpose||"—"}</td><td>{t.createdBy||"—"}</td></tr>)}</tbody></table></div></div>;
}

function RequestTable({requests,onReview}) {
  return <div className="card"><div className="card-title-row"><div><h3>Employee component requests</h3><p>Review requests before stock is issued.</p></div></div><div className="table-wrap"><table><thead><tr><th>Employee</th><th>Component</th><th>Qty</th><th>Purpose</th><th>Status</th><th>Requested</th><th>Action</th></tr></thead><tbody>{requests.map(r=><tr key={r.id}><td><b>{r.employee.name}</b><small>{r.employee.employeeId}</small></td><td>{r.component.name}</td><td>{r.quantity}</td><td>{r.purpose||"—"}</td><td><StatusBadge value={r.status}/></td><td>{new Date(r.requestedAt).toLocaleString()}</td><td>{r.status==="PENDING"?<button className="btn btn-accent btn-sm" onClick={()=>onReview(r)}>Review</button>:<span className="muted">{r.adminRemark||"Processed"}</span>}</td></tr>)}{!requests.length&&<tr><td colSpan="7" className="empty-state">No employee requests.</td></tr>}</tbody></table></div></div>;
}

function UsageTable({usage,onReview}) {
  return <div className="card"><div className="card-title-row"><div><h3>Assigned assets & usage</h3><p>Monitor issued hardware and employee return requests.</p></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Component</th><th>Qty</th><th>Status</th><th>Project / notes</th><th>Action</th></tr></thead><tbody>{usage.map(u=><tr key={u.id}><td>{new Date(u.createdAt).toLocaleString()}</td><td>{u.employee.name}</td><td>{u.component.name}</td><td>{u.quantity}</td><td><StatusBadge value={u.usageStatus}/></td><td>{u.projectName||"—"}<small>{u.notes||""}</small></td><td>{u.usageStatus==="RETURN_REQUESTED"?<button className="btn btn-accent btn-sm" onClick={()=>onReview(u)}>Review return</button>:<span className="muted">—</span>}</td></tr>)}{!usage.length&&<tr><td colSpan="7" className="empty-state">No asset usage updates yet.</td></tr>}</tbody></table></div></div>;
}

function AuditTable({audit}) {
  return <div className="card"><div className="card-title-row"><div><h3>Audit log</h3><p>Recent inventory actions recorded by the system.</p></div></div><div className="audit-list">{audit.map(x=><div className="audit-row" key={x.id}><span className="audit-icon">•</span><div><b>{x.action.replaceAll("_"," ")}</b><span>{x.details}</span></div><div><strong>{x.actor}</strong><small>{new Date(x.createdAt).toLocaleString()}</small></div></div>)}{!audit.length&&<div className="empty-state">No audit events yet.</div>}</div></div>;
}

function Reports({onDone}) {
  const [busy,setBusy]=useState(false);
  const run=async(fn,title)=>{setBusy(true);try{await fn();onDone(title,"Your report download has started.");}catch(e){onDone("Report failed",e.message,"error")}finally{setBusy(false)}};
  return <div className="card reports-card"><h3>Inventory reports</h3><p className="section-sub">Export the current inventory, stock movements, or a print-ready PDF.</p>
    <div className="report-grid"><button className="report-card" disabled={busy} onClick={()=>run(api.downloadComponentsCsv,"Components CSV")}><b>CSV</b><span>Component master data</span><small>Names, categories, stock and locations</small></button>
      <button className="report-card" disabled={busy} onClick={()=>run(api.downloadTransactionsCsv,"Transactions CSV")}><b>CSV</b><span>Transaction history</span><small>IN / OUT movements and purpose</small></button>
      <button className="report-card" disabled={busy} onClick={()=>run(api.downloadInventoryPdf,"Inventory PDF")}><b>PDF</b><span>Inventory snapshot</span><small>Shareable current stock report</small></button></div>
  </div>;
}
