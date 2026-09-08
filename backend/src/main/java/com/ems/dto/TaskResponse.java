package com.ems.dto;

import com.ems.model.Task;
import java.time.LocalDate;
import java.time.LocalDateTime;


public record TaskResponse(
        Long id,
        String title,
        String description,
        EmployeeSummary assignedTo,
        EmployeeSummary assignedBy,
        LocalDate dueDate,
        Task.TaskStatus status,
        String assignmentType,
        String targetDepartment,
        String targetRole,
        LocalDateTime createdAt
) {
    public record EmployeeSummary(Long id, String employeeId, String name, String role, String department, boolean active) {
        public static EmployeeSummary from(com.ems.model.Employee e) {
            if (e == null) return null;
            return new EmployeeSummary(e.getId(), e.getEmployeeId(), e.getName(),
                    e.getRole() == null ? null : e.getRole().name(), e.getDepartment(), e.isActive());
        }
    }

    public static TaskResponse from(Task t) {
        return new TaskResponse(
                t.getId(), t.getTitle(), t.getDescription(),
                EmployeeSummary.from(t.getAssignedTo()),
                EmployeeSummary.from(t.getAssignedBy()),
                t.getDueDate(), t.getStatus(), t.getAssignmentType(),
                t.getTargetDepartment(), t.getTargetRole(), t.getCreatedAt()
        );
    }
}
