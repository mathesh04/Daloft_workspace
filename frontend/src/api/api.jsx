const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function authHeaders() {
  const token = localStorage.getItem("ems_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(response) {
  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = (typeof data === "string" && data.trim()) || (data && data.message) || `Request failed (${response.status})`;
    if (response.status === 401 || response.status === 403) {
      if (response.status === 401) { localStorage.removeItem("ems_token"); localStorage.removeItem("ems_user"); }
    }
    throw new Error(message);
  }
  return data;
}

const GET_CACHE_TTL = 15000;
const getCache = new Map();
const getInflight = new Map();

function invalidateGetCache() {
  getCache.clear();
}

async function get(path) {
  const now = Date.now();
  const cached = getCache.get(path);
  const token = localStorage.getItem("ems_token") || "";
  if (cached && cached.token === token && now - cached.time < GET_CACHE_TTL) return cached.value;
  if (getInflight.has(path)) return getInflight.get(path);
  const request = fetch(`${BASE_URL}${path}`, { headers: { ...authHeaders() } })
    .then(handle)
    .then(data => { getCache.set(path, { time: Date.now(), token, value: data }); return data; })
    .finally(() => getInflight.delete(path));
  getInflight.set(path, request);
  return request;
}

async function post(path, body) {
  const options = {
    method: "POST",
    headers: { ...authHeaders() },
  };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await handle(res); invalidateGetCache(); return data;
}

async function put(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body || {}),
  });
  const data = await handle(res); invalidateGetCache(); return data;
}

async function patch(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body || {}),
  });
  const data = await handle(res); invalidateGetCache(); return data;
}

async function download(path, filename) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

async function del(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const data = await handle(res); invalidateGetCache(); return data;
}

const api = {
  // Production analytics dashboard
  dashboardSummary: () => get("/admin/analytics/summary"),
  attendanceAnalytics: (days=7) => get(`/admin/analytics/attendance?days=${days}`),
  departmentAnalytics: () => get("/admin/analytics/departments"),
  leaveAnalytics: () => get("/admin/analytics/leaves"),
  inventoryAnalyticsV2: () => get("/admin/analytics/inventory"),
  recentActivity: () => get("/admin/analytics/recent-activity"),
  forgotPassword: (identity) => post("/auth/forgot-password", {identity}),
  resetPassword: (token,newPassword) => post("/auth/reset-password", {token,newPassword}),
  myProfile: () => get("/profile/me"),
  updateMyProfile: (payload) => put("/profile/me", payload),
  markWorkFromHome: () => post("/attendance/work-from-home"),
  workFromHomeCheckout: () => post("/attendance/work-from-home/check-out"),
  downloadAttendanceCsv: (m,y) => download(`/admin/reports/attendance?${new URLSearchParams({...(m?{month:m}:{}),...(y?{year:y}:{})})}`, "attendance-report.csv"),
  downloadAttendanceExcel: (m,y) => download(`/admin/reports/attendance/excel?${new URLSearchParams({...(m?{month:m}:{}),...(y?{year:y}:{})})}`, "attendance-report.xlsx"),
  downloadAttendancePdf: (m,y) => download(`/admin/reports/attendance/pdf?${new URLSearchParams({...(m?{month:m}:{}),...(y?{year:y}:{})})}`, "attendance-report.pdf"),
  downloadInventoryReportCsv: () => download("/admin/reports/inventory", "inventory-report.csv"),
  downloadLeaveReportCsv: (m,y) => download(`/admin/reports/leave?${new URLSearchParams({...(m?{month:m}:{}),...(y?{year:y}:{})})}`, "leave-report.csv"),
  // Auth
  login: (employeeId, password) => post("/auth/login", { employeeId, password }),

  // HR_ADMIN: employee lifecycle
  getEmployees: () => get("/admin/employees"),
  adminDepartments: () => get("/admin/employees/departments"),
  createEmployee: (payload) => post("/admin/employees", payload),
  updateEmployee: (id, payload) => put(`/admin/employees/${id}`, payload),
  setEmployeeActive: (id, active) => patch(`/admin/employees/${id}/status`, { active }),
  archiveEmployee: (id) => del(`/admin/employees/${id}`),

  // SYSTEM_ADMIN: HR_ADMIN lifecycle only
  getHrAdmins: () => get("/system-admin/users"),
  createHrAdmin: (payload) => post("/system-admin/users", payload),
  updateHrAdmin: (id, payload) => put(`/system-admin/users/${id}`, payload),
  setHrAdminActive: (id, active) => patch(`/system-admin/users/${id}/status`, { active }),
  systemSummary: () => get("/system-admin/summary"),
  organizationEmployees: () => get("/system-admin/organization/employees"),
  organizationDepartments: () => get("/system-admin/organization/departments"),
  organizationManagers: () => get("/system-admin/organization/managers"),
  createDepartment: (payload) => post("/system-admin/organization/departments", payload),
  updateDepartment: (id,payload) => put(`/system-admin/organization/departments/${id}`, payload),
  makeManager: (id) => post(`/system-admin/organization/employees/${id}/make-manager`),
  removeManager: (id) => post(`/system-admin/organization/employees/${id}/remove-manager`),
  setManagerActive: (id,active) => patch(`/system-admin/organization/employees/${id}/manager-status`, {active}),
  setReportingManager: (id,managerId) => put(`/system-admin/organization/employees/${id}/reporting-manager`, {managerId}),
  getAdminAccess: (id) => get(`/system-admin/organization/admins/${id}/access`),
  saveAdminAccess: (id,payload) => put(`/system-admin/organization/admins/${id}/access`, payload),
  managerTeam: () => get("/manager/team"),
  managerDepartments: () => get("/manager/departments"),
  managerTasks: () => get("/manager/tasks"),
  managerTaskTargets: () => get("/manager/task-targets"),
  systemAdminTasks: () => get("/system-admin/tasks"),
  systemAdminTaskTargets: () => get("/system-admin/tasks/targets"),
  createSystemAdminTask: (payload) => post("/system-admin/tasks", payload),
  managerAttendance: () => get("/manager/attendance"),
  managerLeaves: () => get("/manager/leaves"),
  managerAttendanceCorrections: () => get("/manager/attendance-corrections"),
  reviewManagerAttendanceCorrection: (id,status,reason) => put(`/manager/attendance-corrections/${id}/status`, {status,reason}),
  reviewManagerLeave: (id,status,reason) => put(`/manager/leaves/${id}/status`, {status, ...(reason?{reason}:{})}),
  systemAuditLogs: (filters={}) => get(`/system-admin/audit-logs?${new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==undefined&&v!==null&&v!==""))}`),
  downloadSystemAuditCsv: (filters={}) => download(`/system-admin/audit-logs/export?${new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==undefined&&v!==null&&v!==""))}`, "audit-logs.csv"),
  downloadOrganizationPeopleCsv: () => download("/system-admin/reports/organization", "organization-people-report.csv"),
  downloadOrganizationDepartmentsCsv: () => download("/system-admin/reports/departments", "organization-department-report.csv"),
  downloadOrganizationManagersCsv: () => download("/system-admin/reports/managers", "organization-manager-report.csv"),
  systemSettings: () => get("/system-admin/settings"),
  adminAccessMe: () => get("/admin/access/me"),
  holidays: (year, includeInactive=false) => get(`/admin/holidays?year=${year}&includeInactive=${includeInactive}`),
  createHoliday: (payload) => post("/admin/holidays", payload),
  updateHoliday: (id,payload) => put(`/admin/holidays/${id}`, payload),
  setHolidayActive: (id,active) => patch(`/admin/holidays/${id}/status`, {active}),
  deleteHoliday: (id) => del(`/admin/holidays/${id}`),
  saveSystemSettings: (payload) => put("/system-admin/settings", payload),
  systemHealth: () => get("/system-admin/health"),
  systemSecurity: () => get("/system-admin/security/summary"),
  systemOffices: () => get("/system-admin/offices"),
  createSystemOffice: (payload) => post("/system-admin/offices", payload),
  updateSystemOffice: (id,payload) => put(`/system-admin/offices/${id}`, payload),
  setSystemOfficeActive: (id,active) => patch(`/system-admin/offices/${id}/status`, {active}),

  // Attendance - self
  geofenceConfig: () => get("/attendance/geofence-config"),
  checkIn: (location) => location ? post("/attendance/check-in", location) : post("/attendance/check-in"),
  checkOut: (location) => location ? post("/attendance/check-out", location) : post("/attendance/check-out"),
  myAttendanceHistory: () => get("/attendance/me"),
  myAttendanceToday: () => get("/attendance/me/today"),
  myAttendanceRegularizations: () => get("/attendance/regularization/me"),
  createAttendanceRegularization: (payload) => post("/attendance/regularization", payload),
  leaveBalances: (year) => get(`/leaves/balances${year?`?year=${year}`:""}`),

  // Attendance - admin
  allAttendance: () => get("/admin/attendance"),
  adminAttendanceCorrections: () => get("/admin/attendance-corrections"),
  reviewAdminAttendanceCorrection: (id,status,reason) => put(`/admin/attendance-corrections/${id}/status`, {status, reason}),
  todayAttendance: () => get("/admin/attendance/today"),

  // Phase 3
  myLeaves: () => get("/leaves/me"),
  cancelLeave: (id) => put(`/leaves/${id}/cancel`, {}),
  createLeave: (payload) => post("/leaves", payload),
  allLeaves: () => get("/admin/leaves"),
  reviewLeave: (id, status, reason) => put(`/admin/leaves/${id}/status`, { status, ...(reason?{reason}: {}) }),
  myNotifications: (filters={}) => get(`/notifications/me?${new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==""&&v!==undefined&&v!==null))}`),
  unreadCount: () => get("/notifications/unread-count"),
  readNotification: (id) => put(`/notifications/${id}/read`),
  readAllNotifications: () => put("/notifications/read-all"),
  deleteNotification: (id) => del(`/notifications/${id}`),
  offices: () => get("/admin/offices"),
  createOffice: (payload) => post("/admin/offices", payload),
  deleteOffice: (id) => del(`/admin/offices/${id}`),
  myDamageReports: () => get("/damage-reports/me"),
  createDamageReport: (payload) => post("/damage-reports", payload),
  allDamageReports: () => get("/admin/damage-reports"),
  updateDamageStatus: (id, status) => put(`/admin/damage-reports/${id}/status`, { status }),

  // Announcements
  getAnnouncements: () => get("/announcements"),
  createAnnouncement: (title, message) => post("/admin/announcements", { title, message }),
  deleteAnnouncement: (id) => del(`/admin/announcements/${id}`),

  // Tasks
  myTasks: () => get("/tasks/me"),
  updateMyTaskStatus: (id, status) => patch(`/tasks/${id}/status`, { status }),
  updateManagerTaskStatus: (id, status) => patch(`/manager/tasks/${id}/status`, { status }),
  allTasks: () => get("/admin/tasks"),
  adminTaskTargets: () => get("/admin/tasks/targets"),
  createTask: (payload) => post("/admin/tasks", payload),
  createManagerTask: (payload) => post("/manager/tasks", payload),
  deleteTask: (id) => del(`/admin/tasks/${id}`),
  deleteManagerTask: (id) => del(`/manager/tasks/${id}`),

  inventoryDashboard: () => get("/admin/inventory/dashboard"),
  inventoryAnalytics: () => get("/admin/inventory/analytics"),
  inventoryAuditLogs: () => get("/admin/inventory/audit-logs"),
  getInventoryCategories: () => get("/admin/inventory/categories"),
  createInventoryCategory: (payload) => post("/admin/inventory/categories", payload),
  updateInventoryCategory: (id, payload) => put(`/admin/inventory/categories/${id}`, payload),
  deleteInventoryCategory: (id) => del(`/admin/inventory/categories/${id}`),
  getComponents: () => get("/admin/inventory/components"),
  createComponent: (payload) => post("/admin/inventory/components", payload),
  updateComponent: (id, payload) => put(`/admin/inventory/components/${id}`, payload),
  deleteComponent: (id) => del(`/admin/inventory/components/${id}`),
  updateStock: (id, payload) => post(`/admin/inventory/components/${id}/stock`, payload),
  getStockTransactions: () => get("/admin/inventory/transactions"),
  downloadComponentsCsv: () => download("/admin/inventory/reports/components/csv", "components-report.csv"),
  downloadTransactionsCsv: () => download("/admin/inventory/reports/transactions/csv", "transactions-report.csv"),
  downloadInventoryPdf: () => download("/admin/inventory/reports/inventory/pdf", "inventory-report.pdf"),
  downloadHolidayReportCsv: (year) => download(`/admin/holidays/export?year=${year}`, "holiday-calendar.csv"),

  // Employee inventory workflow
  getAvailableInventory: () => get("/inventory/available"),
  createInventoryRequest: (payload) => post("/inventory/requests", payload),
  myInventoryRequests: () => get("/inventory/requests/me"),
  myInventoryItems: () => get("/inventory/my-items"),
  submitUsageUpdate: (payload) => post("/inventory/usage", payload),
  myUsageUpdates: () => get("/inventory/usage/me"),

  // Admin request and usage review
  getInventoryRequests: () => get("/admin/inventory/requests"),
  reviewInventoryRequest: (id, payload) => post(`/admin/inventory/requests/${id}/review`, payload),
  getInventoryUsageUpdates: () => get("/admin/inventory/usage-updates"),
  reviewInventoryUsage: (id, payload) => post(`/admin/inventory/usage-updates/${id}/review`, payload),

  // Daily Work Reports
  submitDailyReport: (payload) => post("/daily-reports", payload),
  myDailyReports: () => get("/daily-reports/me"),
  myDailyReportToday: () => get("/daily-reports/today"),
  getAdminDailyReports: (filters={}) => get(`/admin/daily-reports?${new URLSearchParams(Object.entries(filters).filter(([,v])=>v!==""&&v!==undefined&&v!==null))}`),
  getAdminDailyReportEmployees: () => get("/admin/daily-reports/employees"),
  downloadEmployeeWiseDailyReportExcel: (employeeId, from, to) => download(`/admin/daily-reports/export/employee-wise?${new URLSearchParams({...(employeeId?{employeeId}:{}),...(from?{from}:{}),...(to?{to}:{})})}`, `employee-work-report-${employeeId||"all"}.xlsx`),
  downloadDateWiseDailyReportExcel: (date, from, to) => download(`/admin/daily-reports/export/date-wise?${new URLSearchParams({...(date?{date}:{}),...(from?{from}:{}),...(to?{to}:{})})}`, `daily-work-report-${date||"range"}.xlsx`),
};

export default api;
