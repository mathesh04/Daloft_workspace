package com.ems.dto;

public class LoginResponse {
    private String token;
    private String employeeId;
    private String name;
    private String role;
    private String department;
    private Long id;

    public LoginResponse(String token, Long id, String employeeId, String name, String role, String department) {
        this.token = token;
        this.id = id;
        this.employeeId = employeeId;
        this.name = name;
        this.role = role;
        this.department = department;
    }

    public String getToken() { return token; }
    public Long getId() { return id; }
    public String getEmployeeId() { return employeeId; }
    public String getName() { return name; }
    public String getRole() { return role; }
    public String getDepartment() { return department; }
}
