package com.ems.model;

import jakarta.persistence.*;

@Entity
@Table(name="leave_balances", uniqueConstraints=@UniqueConstraint(columnNames={"employee_id","leave_year","leave_type"}))
public class LeaveBalance {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="employee_id", nullable=false) private Employee employee;
    @Column(name="leave_year", nullable=false) private int year;
    @Column(name="leave_type",nullable=false,length=40) private String leaveType;
    @Column(name="allocated_days",nullable=false) private int allocatedDays;
    @Column(name="used_days",nullable=false) private int usedDays=0;

    public Long getId(){return id;}
    public Employee getEmployee(){return employee;} public void setEmployee(Employee v){employee=v;}
    public int getYear(){return year;} public void setYear(int v){year=v;}
    public String getLeaveType(){return leaveType;} public void setLeaveType(String v){leaveType=v;}
    public int getAllocatedDays(){return allocatedDays;} public void setAllocatedDays(int v){allocatedDays=Math.max(0,v);}
    public int getUsedDays(){return usedDays;} public void setUsedDays(int v){usedDays=Math.max(0,v);}
    @Transient public int getRemainingDays(){return Math.max(0,allocatedDays-usedDays);}
}
