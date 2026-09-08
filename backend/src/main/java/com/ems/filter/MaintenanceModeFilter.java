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
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
        String path=request.getRequestURI();
        var auth=SecurityContextHolder.getContext().getAuthentication();
        boolean system=auth!=null&&auth.isAuthenticated()&&auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_SYSTEM_ADMIN"));
        if(settings.getBoolean("MAINTENANCE_MODE",false) && path.startsWith("/api/") && !path.startsWith("/api/auth/") && !system){
            response.setStatus(503);response.setContentType("application/json");response.getWriter().write("{\"message\":\"System is currently under maintenance. Please try again later.\"}");return;
        }
        chain.doFilter(request,response);
    }
}
