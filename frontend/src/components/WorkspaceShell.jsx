import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleLabel = {
  SYSTEM_ADMIN: "System Administrator",
  ADMIN: "Administrator",
  HR_ADMIN: "Administrator",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
  INTERN: "Intern",
};

export function DaloftBrand({ compact = false }) {
  return (
    <div
      className={`daloft-brand ${compact ? "compact" : ""}`}
      aria-label="Daloft Aerospace Private Limited"
    >
      <img
        className="daloft-logo-image"
        src="/assets/daloft-aerospace-logo.png"
        alt="Daloft Aerospace"
      />
    </div>
  );
}

function Icon({ name }) {
  const paths = {
    home: "M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5v-9Z",
    people:
      "M16 20v-1.5a4.5 4.5 0 0 0-9 0V20M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-1a3 3 0 0 0-2.1-2.87M17 20v-1a3.5 3.5 0 0 0-2-3.2",
    calendar:
      "M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3-2v4m8-4v4M3 9h18",
    tasks:
      "M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 4h5m-5 4h7m-7 4h4",
    box: "M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Zm0 0 8 4.5 8-4.5M12 12v9",
    leave:
      "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 4h4m-4 4h4m-4 4h4",
    report: "M5 20V10m7 10V4m7 16v-7",
    bell: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4",
    settings:
      "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.5 7.5 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1L15 3h-4l-.3 2.1a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2L4.6 13.5l2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1L11 19h4l.3-2.1a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z",
    shield: "M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z",
    location:
      "M12 21s7-6.1 7-11A7 7 0 0 0 5 10c0 4.9 7 11 7 11Zm0-8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    audit: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    logout: "M10 17l5-5-5-5m5 5H3m10-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6",
    menu: "M4 6h16M4 12h16M4 18h16",
    collapse: "M15 6 9 12l6 6",
  };
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.home} />
    </svg>
  );
}

export default function WorkspaceShell({
  title,
  subtitle,
  navItems,
  active,
  onNavigate,
  children,
  workspaceActions = [],
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("daloft_sidebar_collapsed") === "1",
  );
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const drawerWasOpen = useRef(false);

  useEffect(() => {
    localStorage.setItem("daloft_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!open) {
      if (drawerWasOpen.current) menuButtonRef.current?.focus();
      return;
    }
    drawerWasOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = document.getElementById("primary-navigation");
      const focusable = drawer
        ? [...drawer.querySelectorAll("button:not([disabled])")]
        : [];
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const initials = (user?.name || "User")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isAdminRole = ["SYSTEM_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER"].includes(
    user?.role,
  );
  const userChipMeta = isAdminRole
    ? roleLabel[user?.role] || user?.employeeId || ""
    : user?.employeeId || roleLabel[user?.role] || "";

  const go = (item) => {
    onNavigate?.(item.key);
    setOpen(false);
  };
  const signOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`enterprise-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside
        id="primary-navigation"
        className={`enterprise-sidebar ${open ? "open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="sidebar-head">
          <DaloftBrand compact={collapsed} />
          <button
            ref={closeButtonRef}
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        <button
          className="sidebar-collapse"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          aria-expanded={!collapsed}
        >
          <Icon name="collapse" />
        </button>

        <div className="sidebar-context">
          <span className="context-dot" />
          <div>
            <strong>{roleLabel[user?.role] || "Workspace"}</strong>
            <small>Secure workspace</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section">WORKSPACE</span>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`side-nav-item ${active === item.key ? "active" : ""}`}
              onClick={() => go(item)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={active === item.key ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
              {item.badge ? <em>{item.badge}</em> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {workspaceActions.map((action) => (
            <button
              key={action.label}
              className="side-nav-item workspace-action"
              onClick={action.onClick}
              title={collapsed ? action.label : undefined}
              aria-label={action.label}
            >
              <Icon name={action.icon || "home"} />
              <span className="nav-label">{action.label}</span>
            </button>
          ))}
          <button
            className="side-nav-item workspace-action"
            onClick={signOut}
            title={collapsed ? "Sign out" : undefined}
            aria-label="Sign out"
          >
            <Icon name="logout" />
            <span className="nav-label">Sign out</span>
          </button>
          <div className="sidebar-footer">
            <span>DALOFT PEOPLE</span>
            <small>Enterprise people platform</small>
          </div>
        </div>
      </aside>
      <div className="shell-main">
        <header className="enterprise-topbar">
          <button
            ref={menuButtonRef}
            className="mobile-menu"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="primary-navigation"
          >
            <Icon name="menu" />
          </button>
          <div className="topbar-title">
            <span className="eyebrow">DALOFT PEOPLE</span>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="topbar-tools">
            <button
              className="top-icon"
              onClick={() => onNavigate?.("notifications")}
              title="Notifications"
              aria-label="Open notifications"
            >
              <Icon name="bell" />
            </button>
            <div
              id="topbar-actions"
              className="topbar-actions"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            />
            <div className="topbar-divider" />
            <div className="user-chip">
              <span className="avatar">{initials}</span>
              <div>
                <strong>{user?.name || "User"}</strong>
                <small>{userChipMeta}</small>
              </div>
            </div>
          </div>
        </header>
        <main className="enterprise-content">{children}</main>
      </div>

      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export { Icon };
