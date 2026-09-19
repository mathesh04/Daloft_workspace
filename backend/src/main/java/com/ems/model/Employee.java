package com.ems.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false, unique = true)
    @NotBlank
    private String employeeId;

    @Column(nullable = false)
    @NotBlank
    private String name;

    @JsonIgnore
    @Column(nullable = false)
    @NotBlank
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.EMPLOYEE;

    @Column(nullable = false)
    private String department;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporting_manager_id")
    private Employee reportingManager;

    private String email;

    private String phoneNumber;
    @Column(length = 1000) private String address;
    private String emergencyContact;
    private String designation;
    private String profilePictureUrl;
    private java.time.LocalDate joiningDate;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "login_failed_attempts", nullable = false)
    private int loginFailedAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Employee() {}


    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Employee getReportingManager() { return reportingManager; }
    public void setReportingManager(Employee reportingManager) { this.reportingManager = reportingManager; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber(){return phoneNumber;} public void setPhoneNumber(String v){phoneNumber=v;}
    public String getAddress(){return address;} public void setAddress(String v){address=v;}
    public String getEmergencyContact(){return emergencyContact;} public void setEmergencyContact(String v){emergencyContact=v;}
    public String getDesignation(){return designation;} public void setDesignation(String v){designation=v;}
    public String getProfilePictureUrl(){return profilePictureUrl;} public void setProfilePictureUrl(String v){profilePictureUrl=v;}
    public java.time.LocalDate getJoiningDate(){return joiningDate;} public void setJoiningDate(java.time.LocalDate v){joiningDate=v;}

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public int getLoginFailedAttempts() { return loginFailedAttempts; }
    public void setLoginFailedAttempts(int v) { loginFailedAttempts = Math.max(0, v); }
    public LocalDateTime getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(LocalDateTime v) { lockedUntil = v; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
