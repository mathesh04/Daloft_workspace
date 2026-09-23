package com.ems.filter;

import com.ems.service.SystemSettingsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public class MaintenanceModeFilter extends OncePerRequestFilter {
    private final SystemSettingsService settings;
    public MaintenanceModeFilter(SystemSettingsService settings){this.settings=settings;}
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();

        if (path.startsWith("/api/") && !path.startsWith("/api/auth/")) {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            boolean system = auth != null && auth.isAuthenticated()
                    && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMIN"));

            if (settings.getBoolean("MAINTENANCE_MODE", false) && !system) {
                response.setStatus(503);
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"System is currently under maintenance. Please try again later.\"}");
                return;
            }

            if (auth != null && auth.isAuthenticated() && !system) {
                boolean intern = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_INTERN"));
                boolean employee = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_EMPLOYEE"));
                boolean manager = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
                boolean admin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_HR_ADMIN"));

                if (intern && !settings.getBoolean("INTERN_LOGIN_ENABLED", true)) {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"Intern access is currently disabled by your organization administrator.\"}");
                    return;
                }
                if (employee && !settings.getBoolean("EMPLOYEE_LOGIN_ENABLED", true)) {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"Employee access is currently disabled by your organization administrator.\"}");
                    return;
                }
                if (manager && !settings.getBoolean("MANAGER_LOGIN_ENABLED", true)) {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"Manager access is currently disabled by your organization administrator.\"}");
                    return;
                }
                if (admin && !settings.getBoolean("ADMIN_LOGIN_ENABLED", settings.getBoolean("HR_ADMIN_LOGIN_ENABLED", true))) {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"message\":\"Administrator access is currently disabled by your organization administrator.\"}");
                    return;
                }
            }
        }

        chain.doFilter(request, response);
    }
}
