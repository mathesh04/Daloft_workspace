package com.ems.dto;

import com.ems.model.Employee;
import com.ems.model.LeaveRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

public record LeaveRequestResponse(
        Long id,
        Map<String,Object> employee,
        String leaveType,
        LocalDate startDate,
        LocalDate endDate,
        int workingDays,
        String reason,
        String status,
        LocalDateTime createdAt,
        String rejectionReason,
        boolean balanceApplied
) {
    public LeaveRequestResponse(LeaveRequest r) {
        this(r.getId(), employeeSummary(r.getEmployee()), r.getLeaveType(), r.getStartDate(), r.getEndDate(),
                r.getWorkingDays(), r.getReason(), r.getStatus() == null ? null : r.getStatus().name(),
                r.getCreatedAt(), r.getRejectionReason(), r.isBalanceApplied());
    }

    private static Map<String,Object> employeeSummary(Employee e) {
        if (e == null) return null;
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("id", e.getId());
        out.put("employeeId", e.getEmployeeId());
        out.put("name", e.getName());
        out.put("department", e.getDepartment());
        out.put("role", e.getRole() == null ? null : e.getRole().name());
        return out;
    }
}
