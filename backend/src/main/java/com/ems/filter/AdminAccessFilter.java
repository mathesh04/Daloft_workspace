package com.ems.filter;

import com.ems.service.AdminAccessService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public class AdminAccessFilter extends OncePerRequestFilter {
    private final AdminAccessService access;
    public AdminAccessFilter(AdminAccessService a){access=a;}

    @Override
    protected void doFilterInternal(HttpServletRequest r,HttpServletResponse p,FilterChain c)
            throws ServletException,IOException {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        String path=r.getRequestURI();
        if(auth!=null && auth.isAuthenticated()
                && path.startsWith("/api/admin/")
                && auth.getAuthorities().stream().anyMatch(x->x.getAuthority().equals("ROLE_HR_ADMIN"))){
            String perm=permission(path);
            if(perm!=null && !access.allowed(auth.getName(),perm)){
                p.setStatus(403);
                p.setContentType("application/json");
                p.getWriter().write("{\"message\":\"Your administrator account does not have access to this function\"}");
                return;
            }
        }
        c.doFilter(r,p);
    }

    /**
     * More-specific module paths must win over generic report/analytics paths.
     * This is important because inventory contains its own reports/analytics endpoints.
     */
    private String permission(String p){
        if(p.contains("/inventory")) return "INVENTORY";
        if(p.contains("/holidays")) return "HOLIDAY_CALENDAR";
        if(p.contains("/attendance")) return "ATTENDANCE";
        if(p.contains("/leave")) return "LEAVE";
        if(p.contains("/employees") || p.contains("/damage")) return "PEOPLE";
        if(p.contains("/announcements")) return "COMMUNICATION";
        if(p.contains("/offices")) return "OFFICE";
        if(p.contains("/tasks")) return "TASKS";
        if(p.contains("/reports") || p.contains("/analytics") || p.contains("/daily-reports")) return "REPORTS";
        return null;
    }
}
