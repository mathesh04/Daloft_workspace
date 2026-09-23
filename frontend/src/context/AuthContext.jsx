import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../api/api";
import { isTokenExpired, getTokenRemainingMs } from "../utils/jwt";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessionNotice, setSessionNotice] = useState(() => {
    const token = localStorage.getItem("ems_token");
    if (token && isTokenExpired(token)) {
      return "Your session has expired. Please sign in again.";
    }
    return sessionStorage.getItem("ems_session_notice") || "";
  });

  const clearSessionNotice = useCallback(() => {
    setSessionNotice("");
    sessionStorage.removeItem("ems_session_notice");
  }, []);

  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("ems_token");
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem("ems_token");
      localStorage.removeItem("ems_user");
      return null;
    }
    const raw = localStorage.getItem("ems_user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("ems_token");
      localStorage.removeItem("ems_user");
      return null;
    }
  });

  const logout = useCallback((reason = "") => {
    localStorage.removeItem("ems_token");
    localStorage.removeItem("ems_user");
    setUser(null);
    if (reason) {
      setSessionNotice(reason);
      sessionStorage.setItem("ems_session_notice", reason);
    }
  }, []);

  const login = useCallback(async (employeeId, password) => {
    clearSessionNotice();
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
  }, [clearSessionNotice]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("ems_token");
    if (!token || isTokenExpired(token)) {
      logout("Your session has expired. Please sign in again.");
      return;
    }

    const remainingMs = getTokenRemainingMs(token);
    const timer = setTimeout(() => {
      logout("Your session has timed out. Please sign in again.");
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [user, logout]);


  useEffect(() => {
    if (!user) return;

    function verifySession() {
      const token = localStorage.getItem("ems_token");
      if (!token || isTokenExpired(token)) {
        logout("Your session has expired. Please sign in again.");
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        verifySession();
      }
    };

    window.addEventListener("focus", verifySession);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", verifySession);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, logout]);


  useEffect(() => {
    function handleStorage(e) {
      if (e.key === "ems_token" && !e.newValue) {
        setUser(null);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);


  useEffect(() => {
    function handleSessionExpired(e) {
      const reason = e?.detail?.reason || "Your session has expired. Please sign in again.";
      logout(reason);
    }

    window.addEventListener("ems:session-expired", handleSessionExpired);
    return () => window.removeEventListener("ems:session-expired", handleSessionExpired);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, sessionNotice, clearSessionNotice }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
