package com.ems.filter;

import com.ems.model.AuditLog;
import com.ems.repository.AuditLogRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class AuditRequestFilter extends OncePerRequestFilter {

    private final AuditLogRepository repo;

    public AuditRequestFilter(AuditLogRepository r) {
        repo = r;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest req,
                                    @NonNull HttpServletResponse res,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {
        try {
            chain.doFilter(req, res);
        } finally {
            String path = req.getRequestURI();
            String method = req.getMethod();
            if (path.startsWith("/api/")
                    && !path.startsWith("/api/system-admin/audit-logs")
                    && !method.equals("GET")
                    && !method.equals("OPTIONS")) {
                var auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated()) {
                    AuditLog a = new AuditLog();
                    a.setActor(auth.getName());
                    a.setActorEmployeeId(auth.getName());
                    a.setAction(method + " " + path);
                    a.setDetails("API operation");
                    a.setStatus(String.valueOf(res.getStatus()));
                    a.setIpAddress(req.getRemoteAddr());
                    a.setActorRole(auth.getAuthorities().stream()
                            .findFirst()
                            .map(x -> x.getAuthority().replace("ROLE_", ""))
                            .orElse(null));
                    try {
                        repo.save(a);
                    } catch (Exception ignored) {
                        
                    }
                }
            }
        }
    }
}
