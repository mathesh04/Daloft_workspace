package com.ems.dto;

import jakarta.validation.constraints.NotBlank;

public class EmployeeRequest {
    @NotBlank
    private String employeeId;

    @NotBlank
    private String name;

    private String password;

    @NotBlank
    private String role;

    @NotBlank
    private String department;

    private Long reportingManagerId;

    @NotBlank
    private String designation;

    private String email;
    private String phoneNumber; 
    private String address;
     private String emergencyContact; 
     private String profilePictureUrl; 
     private java.time.LocalDate joiningDate;

    public String getEmployeeId() { 
        return employeeId; 
    }
    public void setEmployeeId(String employeeId) { 
        this.employeeId = employeeId; 
    }

    public String getName() { 
        return name; 
    }
    public void setName(String name) { 
        this.name = name; 
    }

    public String getPassword() { 
        return password; 
    }
    public void setPassword(String password) { 
        this.password = password; 
    }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Long getReportingManagerId(){return reportingManagerId;} public void setReportingManagerId(Long v){reportingManagerId=v;}

    public String getEmail() { return email; } public void setEmail(String email) { this.email = email; }
    public String getPhoneNumber(){return phoneNumber;} public void setPhoneNumber(String v){phoneNumber=v;} public String getAddress(){return address;} public void setAddress(String v){address=v;} public String getEmergencyContact(){return emergencyContact;} public void setEmergencyContact(String v){emergencyContact=v;} public String getDesignation(){return designation;} public void setDesignation(String v){designation=v;} public String getProfilePictureUrl(){return profilePictureUrl;} public void setProfilePictureUrl(String v){profilePictureUrl=v;} public java.time.LocalDate getJoiningDate(){return joiningDate;} public void setJoiningDate(java.time.LocalDate v){joiningDate=v;}
}
