package com.ems.model;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"employee_id", "work_date"})
})
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Employee employee;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

    @Column(name = "check_in_latitude")
    private Double checkInLatitude;

    @Column(name = "check_in_longitude")
    private Double checkInLongitude;

    @Column(name = "check_in_accuracy")
    private Double checkInAccuracy;

    @Column(name = "check_in_distance_meters")
    private Double checkInDistanceMeters;

    @Column(name = "check_in_location_verified", nullable = false)
    private boolean checkInLocationVerified = false;

    @Column(name = "check_out_latitude")
    private Double checkOutLatitude;

    @Column(name = "check_out_longitude")
    private Double checkOutLongitude;

    @Column(name = "check_out_accuracy")
    private Double checkOutAccuracy;

    @Column(name = "check_out_distance_meters")
    private Double checkOutDistanceMeters;

    @Column(name = "check_out_location_verified", nullable = false)
    private boolean checkOutLocationVerified = false;

    @Column(name = "working_minutes")
    private Long workingMinutes;

    @Column(name = "working_hours")
    private Double workingHours;

    @Column(name = "overtime_minutes")
    private Long overtimeMinutes = 0L;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status = AttendanceStatus.PRESENT;

    public Attendance() {}

    public enum AttendanceStatus {
        PRESENT, LATE, HALF_DAY, ABSENT, WORK_FROM_HOME
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public LocalDate getWorkDate() { return workDate; }
    public void setWorkDate(LocalDate workDate) { this.workDate = workDate; }

    public LocalDateTime getCheckInTime() { return checkInTime; }
    public void setCheckInTime(LocalDateTime checkInTime) { this.checkInTime = checkInTime; }

    public LocalDateTime getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(LocalDateTime checkOutTime) { this.checkOutTime = checkOutTime; }

    public Double getCheckInLatitude() { return checkInLatitude; }
    public void setCheckInLatitude(Double value) { this.checkInLatitude = value; }

    public Double getCheckInLongitude() { return checkInLongitude; }
    public void setCheckInLongitude(Double value) { this.checkInLongitude = value; }

    public Double getCheckInAccuracy() { return checkInAccuracy; }
    public void setCheckInAccuracy(Double value) { this.checkInAccuracy = value; }

    public Double getCheckInDistanceMeters() { return checkInDistanceMeters; }
    public void setCheckInDistanceMeters(Double value) { this.checkInDistanceMeters = value; }

    public boolean isCheckInLocationVerified() { return checkInLocationVerified; }
    public void setCheckInLocationVerified(boolean value) { this.checkInLocationVerified = value; }

    public Double getCheckOutLatitude() { return checkOutLatitude; }
    public void setCheckOutLatitude(Double value) { this.checkOutLatitude = value; }

    public Double getCheckOutLongitude() { return checkOutLongitude; }
    public void setCheckOutLongitude(Double value) { this.checkOutLongitude = value; }

    public Double getCheckOutAccuracy() { return checkOutAccuracy; }
    public void setCheckOutAccuracy(Double value) { this.checkOutAccuracy = value; }

    public Double getCheckOutDistanceMeters() { return checkOutDistanceMeters; }
    public void setCheckOutDistanceMeters(Double value) { this.checkOutDistanceMeters = value; }

    public boolean isCheckOutLocationVerified() { return checkOutLocationVerified; }
    public void setCheckOutLocationVerified(boolean value) { this.checkOutLocationVerified = value; }

    public Long getWorkingMinutes() { return workingMinutes; }
    public void setWorkingMinutes(Long value) { workingMinutes = value; }
    public Double getWorkingHours() { return workingHours; }
    public void setWorkingHours(Double value) { workingHours = value; }
    public Long getOvertimeMinutes(){ return overtimeMinutes; }
    public void setOvertimeMinutes(Long value){ overtimeMinutes = value; }

    public AttendanceStatus getStatus() { return status; }
    public void setStatus(AttendanceStatus status) { this.status = status; }
}
