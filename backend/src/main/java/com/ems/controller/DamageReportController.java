package com.ems.controller;

import com.ems.model.*;
import com.ems.repository.*;
import com.ems.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
public class DamageReportController {
    private final DamageReportRepository repo;
    private final EmployeeRepository employees;
    private final ComponentRepository components;
    private final InventoryRequestRepository requests;
    private final NotificationService notifications;

    DamageReportController(
            DamageReportRepository repo,
            EmployeeRepository employees,
            ComponentRepository components,
            InventoryRequestRepository requests,
            NotificationService notifications) {
        this.repo = repo;
        this.employees = employees;
        this.components = components;
        this.requests = requests;
        this.notifications = notifications;
    }

    @PostMapping("/api/damage-reports")
    @ResponseStatus(HttpStatus.CREATED)
    public DamageReport create(Authentication authentication, @RequestBody DamageReport report) {
        if (report.getComponentId() == null) {
            throw new IllegalArgumentException("Please select the component you want to report.");
        }
        if (report.getIssueType() == null || report.getIssueType().isBlank()) {
            throw new IllegalArgumentException("Issue type is required");
        }

        Employee employee = employees.findByEmployeeId(authentication.getName()).orElseThrow();
        components.findById(report.getComponentId())
                .orElseThrow(() -> new IllegalArgumentException("Selected component was not found"));

        boolean assignedToEmployee = requests
                .findByEmployeeEmployeeIdOrderByRequestedAtDesc(employee.getEmployeeId())
                .stream()
                .anyMatch(request -> request.getStatus() == RequestStatus.APPROVED
                        && request.getComponent() != null
                        && Objects.equals(request.getComponent().getId(), report.getComponentId()));

        if (!assignedToEmployee) {
            throw new IllegalArgumentException("You can report only components currently assigned to you.");
        }

        report.setEmployee(employee);
        report.setStatus("REPORTED");
        DamageReport saved = repo.save(report);
        notifications.notifyAdmins(
                "New damage report",
                employee.getName() + " (" + employee.getEmployeeId() + ") reported "
                        + saved.getIssueType() + " for component ID " + saved.getComponentId() + ".",
                "DAMAGE");
        return saved;
    }

    @GetMapping("/api/damage-reports/me")
    public List<DamageReport> mine(Authentication authentication) {
        return repo.findByEmployeeEmployeeIdOrderByCreatedAtDesc(authentication.getName());
    }

    @GetMapping("/api/admin/damage-reports")
    public List<DamageReport> all() {
        return repo.findAll();
    }

    @PutMapping("/api/admin/damage-reports/{id}/status")
    public DamageReport status(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = Optional.ofNullable(body.get("status"))
                .orElse("")
                .trim()
                .toUpperCase(Locale.ROOT);

        Set<String> allowed = Set.of(
                "REPORTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "RESOLVED");

        if (!allowed.contains(status)) {
            throw new IllegalArgumentException("Invalid damage report status");
        }

        DamageReport report = repo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Damage report not found"));

        report.setStatus(status);
        DamageReport saved = repo.save(report);

        notifications.create(
                saved.getEmployee(),
                "Damage report updated",
                "Your damage report status is " + status + ".",
                "DAMAGE",
                true
        );

        return saved;
    }
}
