import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
const AdminDashboard = lazy(() => import("./components/AdminDashboard"));
const EmployeeDashboard = lazy(() => import("./components/EmployeeDashboard"));
const ManagerDashboard = lazy(() => import("./components/ManagerDashboard"));

const isAdminRole = (role) => role === "ADMIN" || role === "HR_ADMIN";
const isHrRole = isAdminRole;
const isSystemRole = (role) => role === "SYSTEM_ADMIN";
const isManagerRole = (role) => role === "MANAGER";

function PrivateRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if ((role === "ADMIN" || role === "ADMIN") && !isAdminRole(user.role)) return <Navigate to={isSystemRole(user.role)?"/system":"/employee"} replace />;
  if (role === "SYSTEM_ADMIN" && !isSystemRole(user.role)) return <Navigate to={isAdminRole(user.role)?"/admin":isManagerRole(user.role)?"/manager":"/employee"} replace />;
  if (role === "MANAGER" && !isManagerRole(user.role)) return <Navigate to={isSystemRole(user.role)?"/system":isAdminRole(user.role)?"/admin":"/employee"} replace />;
  if (role === "WORKER" && !(user.role === "EMPLOYEE" || user.role === "INTERN" || user.role === "ADMIN" || user.role === "ADMIN" || user.role === "MANAGER")) return <Navigate to="/system" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"Inter,Segoe UI,sans-serif",color:"#65746e"}}>Loading Daloft People…</div>}>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={isSystemRole(user.role) ? "/system" : isAdminRole(user.role) ? "/admin" : isManagerRole(user.role) ? "/manager" : "/employee"} replace />
            ) : (
              <Login />
            )
          }
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/system"
          element={<PrivateRoute role="SYSTEM_ADMIN"><AdminDashboard /></PrivateRoute>}
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute role="ADMIN">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/:module"
          element={
            <PrivateRoute role="ADMIN">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route path="/manager" element={<PrivateRoute role="MANAGER"><ManagerDashboard /></PrivateRoute>} />
        <Route
          path="/employee"
          element={
            <PrivateRoute role="WORKER">
              <EmployeeDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? (isSystemRole(user.role) ? "/system" : isAdminRole(user.role) ? "/admin" : isManagerRole(user.role) ? "/manager" : "/employee") : "/login"} replace />}
        />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
