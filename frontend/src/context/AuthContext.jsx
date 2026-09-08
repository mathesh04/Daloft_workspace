import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("ems_user");
    try { return raw ? JSON.parse(raw) : null; } catch { localStorage.removeItem("ems_user"); return null; }
  });

  const login = useCallback(async (employeeId, password) => {
    const data = await api.login(employeeId, password);
    localStorage.setItem("ems_token", data.token);
    const sessionUser = {
      id: data.id,
      employeeId: data.employeeId,
      name: data.name,
      role: data.role,
      department: data.department,
      permissions: data.permissions || [],
    };
    localStorage.setItem("ems_user", JSON.stringify(sessionUser));
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ems_token");
    localStorage.removeItem("ems_user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
