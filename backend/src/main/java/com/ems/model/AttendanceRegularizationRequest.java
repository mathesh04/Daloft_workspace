package com.ems.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name="attendance_regularization_requests")
public class AttendanceRegularizationRequest {
    @Id 
    @GeneratedValue(strategy=GenerationType.IDENTITY) 
    private Long id;
    @ManyToOne(fetch=FetchType.LAZY) 
    @JoinColumn(name="employee_id",nullable=false)
    private Employee employee;
    @ManyToOne(fetch=FetchType.LAZY) 
    @JoinColumn(name="attendance_id",nullable=false) 
    private Attendance attendance;
    private LocalDateTime requestedCheckIn;
    private LocalDateTime requestedCheckOut;
    @Column(length=2000,nullable=false) 
    private String reason;
    @Enumerated(EnumType.STRING) 
    @Column(nullable=false) 
    private RegularizationStatus status=RegularizationStatus.PENDING;
    private String reviewedBy;
    private LocalDateTime reviewedAt;
    @Column(length=2000) 
    private String reviewReason;
    private LocalDateTime createdAt=LocalDateTime.now();

    public enum RegularizationStatus { PENDING, APPROVED, REJECTED }
    public Long getId(){
        return id;
    } 
    public Employee getEmployee(){
        return employee;
    } 
    public void setEmployee(Employee v){
        employee=v;
    }
    public Attendance getAttendance(){
        return attendance;
    } 
    public void setAttendance(Attendance v){
        attendance=v;
    }
    public LocalDateTime getRequestedCheckIn(){
        return requestedCheckIn;
    } 
    public void setRequestedCheckIn(LocalDateTime v){
        requestedCheckIn=v;
    }
    public LocalDateTime getRequestedCheckOut(){
        return requestedCheckOut;
    } 
    public void setRequestedCheckOut(LocalDateTime v){
        requestedCheckOut=v;
    }
    public String getReason(){
        return reason;
    } 
    public void setReason(String v){
        reason=v;
    }
    public RegularizationStatus getStatus(){
        return status;
    } 
    public void setStatus(RegularizationStatus v){
        status=v;
    }
    public String getReviewedBy(){return reviewedBy;} public void setReviewedBy(String v){reviewedBy=v;}
    public LocalDateTime getReviewedAt(){return reviewedAt;} public void setReviewedAt(LocalDateTime v){reviewedAt=v;}
    public String getReviewReason(){return reviewReason;} public void setReviewReason(String v){reviewReason=v;}
    public LocalDateTime getCreatedAt(){return createdAt;}
}
