package com.ems.service;

import com.ems.model.*;
import com.ems.repository.AuditLogRepository;
import com.ems.repository.EmployeeRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository repo;
    private final EmployeeRepository employees;

    public AuditService(AuditLogRepository r, EmployeeRepository e) {
        repo = r;
        employees = e;
    }

    public void log(Authentication auth, String action, String details,
            String entityType, Object entityId, String status,
            HttpServletRequest req) {
        AuditLog a = new AuditLog();
        String actor = auth == null ? "SYSTEM" : auth.getName();
        a.setActor(actor);
        a.setAction(action);
        a.setDetails(details);
        a.setEntityType(entityType);
        a.setEntityId(entityId == null ? null : String.valueOf(entityId));
        a.setStatus(status == null ? "SUCCESS" : status);
        a.setIpAddress(req == null ? null : req.getRemoteAddr());
        if (auth != null) {
            employees.findByEmployeeId(auth.getName()).ifPresent(e -> {
                a.setActorEmployeeId(e.getEmployeeId());
                a.setActorRole(e.getRole().name());
            });
        }
        repo.save(a);
    }

    public void logAuthEvent(String actorId, String action, String details, Object entityId, String status, HttpServletRequest req) {
        AuditLog a = new AuditLog();
        a.setActor(actorId == null || actorId.isBlank() ? "UNKNOWN" : actorId);
        a.setActorEmployeeId(actorId);
        a.setAction(action);
        a.setDetails(details);
        a.setEntityType("AUTH");
        a.setEntityId(entityId == null ? null : String.valueOf(entityId));
        a.setStatus(status == null ? "SUCCESS" : status);
        a.setIpAddress(req == null ? null : req.getRemoteAddr());
        if (actorId != null) {
            employees.findByEmployeeId(actorId).ifPresent(e -> a.setActorRole(e.getRole().name()));
        }
        repo.save(a);
    }

    public void log(Authentication auth, String action, String details, String entityType, Object entityId, String status, HttpServletRequest req, String reason) {
        String merged = details;
        if (reason != null && !reason.isBlank()) {
            merged = details + " | Reason: " + reason.trim();
        }
        log(auth, action, merged, entityType, entityId, status, req);
    }

    public void log(Authentication a, String action, String details) {
        log(a, action, details, null, null, "SUCCESS", null);
    }
}
