package com.ems.model;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum Role {
    SYSTEM_ADMIN,
    ADMIN,
    HR_ADMIN,
    MANAGER,
    EMPLOYEE,
    INTERN;

    @JsonCreator
    public static Role fromString(String val) {
        if (val == null || val.isBlank()) return EMPLOYEE;
        String normalized = val.trim().toUpperCase();
        if ("HR_ADMIN".equals(normalized)) return ADMIN;
        return Role.valueOf(normalized);
    }
}
