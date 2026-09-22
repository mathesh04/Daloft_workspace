package com.ems.dto;

import com.ems.model.Employee;
import org.hibernate.Hibernate;
import java.time.LocalDateTime;

public class EmployeeResponse {
    private Long id;
    private String employeeId;
    private String name;
    private String role;
    private String department;
    private Long reportingManagerId;
    private String reportingManagerName;
    private String email;
    private String phoneNumber; private String address; private String emergencyContact; private String designation; private String profilePictureUrl; private java.time.LocalDate joiningDate;
    private boolean active;
    private LocalDateTime createdAt;

    public EmployeeResponse(Employee e) {
        this.id = e.getId();
        this.employeeId = e.getEmployeeId();
        this.name = e.getName();
        this.role = e.getRole().name();
        this.department = e.getDepartment();
        if (e.getReportingManager() != null) {
            this.reportingManagerId = e.getReportingManager().getId();
            this.reportingManagerName = Hibernate.isInitialized(e.getReportingManager()) ? e.getReportingManager().getName() : null;
        } else {
            this.reportingManagerId = null;
            this.reportingManagerName = null;
        }
        this.email = e.getEmail();
        this.phoneNumber=e.getPhoneNumber(); this.address=e.getAddress(); this.emergencyContact=e.getEmergencyContact(); this.designation=e.getDesignation(); this.profilePictureUrl=e.getProfilePictureUrl(); this.joiningDate=e.getJoiningDate();
        this.active = e.isActive();
        this.createdAt = e.getCreatedAt();
    }

    public Long getId() { return id; }
    public String getEmployeeId() { return employeeId; }
    public String getName() { return name; }
    public String getRole() { return role; }
    public String getDepartment() { return department; }
    public Long getReportingManagerId(){return reportingManagerId;} 
    public String getReportingManagerName(){return reportingManagerName;}
    public String getEmail() { return email; }
    public String getPhoneNumber(){return phoneNumber;} public String getAddress(){return address;} 
    public String getEmergencyContact(){return emergencyContact;} 
    public String getDesignation(){return designation;} 
    public String getProfilePictureUrl(){return profilePictureUrl;} 
    public java.time.LocalDate getJoiningDate(){return joiningDate;}
    public boolean isActive() { return active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
