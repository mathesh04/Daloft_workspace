package com.ems.controller;

import com.ems.dto.TaskResponse;
import com.ems.dto.TaskTargetResponse;
import com.ems.model.Role;
import com.ems.model.Task;
import com.ems.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
public class TaskController {

    private final TaskService tasks;

    public TaskController(TaskService tasks) {
        this.tasks = tasks;
    }

    @GetMapping("/api/tasks/me")
    public List<TaskResponse> me(Authentication auth) {
        return tasks.getForEmployee(auth.getName())
                .stream()
                .map(TaskResponse::from)
                .toList();
    }

    @PatchMapping({"/api/tasks/{id}/status", "/api/manager/tasks/{id}/status"})
    public ResponseEntity<?> status(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth
    ) {
        try {
            String raw = body == null ? null : body.get("status");
            if (raw == null || raw.isBlank()) {
                throw new IllegalArgumentException("Task status is required");
            }

            Task.TaskStatus status = Task.TaskStatus.valueOf(raw.trim().toUpperCase());
            boolean admin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMIN")
                            || a.getAuthority().equals("ROLE_ADMIN")
                            || a.getAuthority().equals("ROLE_HR_ADMIN"));

            return ResponseEntity.ok(
                    TaskResponse.from(tasks.updateStatus(id, status, auth.getName(), admin))
            );
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/api/admin/tasks/targets")
    public TaskTargetResponse adminTargets(Authentication auth) {
        ensureTaskAdmin(auth);
        return tasks.getTaskTargetsForAdmin(auth.getName());
    }

    @GetMapping("/api/system-admin/tasks/targets")
    public TaskTargetResponse systemTargets(Authentication auth) {
        ensureSystemAdmin(auth);
        return tasks.getTaskTargetsForAdmin(auth.getName());
    }

    @GetMapping("/api/admin/tasks")
    public List<TaskResponse> adminTasks(Authentication auth) {
        ensureTaskAdmin(auth);
        return tasks.getAll().stream().map(TaskResponse::from).toList();
    }

    @GetMapping("/api/system-admin/tasks")
    public List<TaskResponse> systemTasks(Authentication auth) {
        ensureSystemAdmin(auth);
        return tasks.getAll().stream().map(TaskResponse::from).toList();
    }

    @GetMapping("/api/manager/tasks")
    public List<TaskResponse> managerTasks(Authentication auth) {
        return tasks.getForManager(auth.getName()).stream().map(TaskResponse::from).toList();
    }

    @GetMapping("/api/manager/task-targets")
    public TaskTargetResponse managerTargets(Authentication auth) {
        return tasks.getTaskTargetsForManager(auth.getName());
    }

    @PostMapping({"/api/admin/tasks", "/api/manager/tasks", "/api/system-admin/tasks"})
    public ResponseEntity<?> create(
            @RequestBody Map<String, Object> body,
            Authentication auth
    ) {
        try {
            if (body == null) throw new IllegalArgumentException("Task request is required");

            LocalDate dueDate = parseDate(body.get("dueDate"));
            String mode = stringValue(body.getOrDefault("assignmentMode", "employee"));
            String title = stringValue(body.get("title"));
            String description = nullableString(body.get("description"));
            String assignedTo = nullableString(body.get("assignedTo"));
            String department = nullableString(body.get("department"));
            String targetRole = nullableString(body.get("targetRole"));

            List<Task> result = tasks.create(
                    title, description, assignedTo, department, targetRole,
                    mode == null ? "employee" : mode.toLowerCase(),
                    dueDate, auth.getName()
            );

            return ResponseEntity.ok(result.stream().map(TaskResponse::from).toList());
        } catch (Exception e) {
            return error(e);
        }
    }

    @DeleteMapping({"/api/admin/tasks/{id}", "/api/manager/tasks/{id}", "/api/system-admin/tasks/{id}"})
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        try {
            tasks.delete(id, auth.getName());
            return ResponseEntity.ok(Map.of("message", "Task removed"));
        } catch (Exception e) {
            return error(e);
        }
    }

    private void ensureTaskAdmin(Authentication auth) {
        if (auth == null || auth.getAuthorities().stream().noneMatch(a ->
                a.getAuthority().equals("ROLE_SYSTEM_ADMIN")
                        || a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_HR_ADMIN"))) {
            throw new AccessDeniedException("Task administration access required");
        }
    }

    private void ensureSystemAdmin(Authentication auth) {
        if (auth == null || auth.getAuthorities().stream()
                .noneMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMIN"))) {
            throw new AccessDeniedException("Organization Admin access required");
        }
    }

    private LocalDate parseDate(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return null;
        return LocalDate.parse(String.valueOf(value));
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private String nullableString(Object value) {
        String s = stringValue(value);
        return s == null || s.isBlank() ? null : s;
    }

    private ResponseEntity<Map<String, String>> error(Exception e) {
        boolean forbidden = e instanceof SecurityException || e instanceof AccessDeniedException;
        String message = e == null || e.getMessage() == null || e.getMessage().isBlank()
                ? "Unable to complete the task operation"
                : e.getMessage();
        return ResponseEntity.status(forbidden ? 403 : 400).body(Map.of("message", message));
    }
}
