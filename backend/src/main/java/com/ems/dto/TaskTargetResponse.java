package com.ems.dto;

import java.util.List;

public record TaskTargetResponse(List<TaskResponse.EmployeeSummary> employees, List<DepartmentSummary> departments) {
    public record DepartmentSummary(Long id, String name, String code, boolean active) {}
}
