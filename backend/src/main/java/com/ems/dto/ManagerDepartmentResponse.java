package com.ems.dto;

public record ManagerDepartmentResponse(
        Long id,
        String name,
        String code,
        Long managerId,
        String managerName,
        boolean active,
        long totalEmployees,
        long activeEmployees
) {
}
