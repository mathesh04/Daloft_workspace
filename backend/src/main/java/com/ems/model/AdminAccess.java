package com.ems.model;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
@Entity @Table(name="admin_access")
public class AdminAccess {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) 
 private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="employee_id") 
 private Employee employee;
 @Column(nullable=false) 
 private String permission;
 @Column(name="scope_type",nullable=false) 
 private String scopeType="ORGANIZATION";
 @Column(name="scope_value") 
 private String scopeValue;
 @Column(nullable=false) 
 private boolean active=true;
 public Long getId(){
    return id;
} 
 public Employee getEmployee(){
    return employee;
} 
public void setEmployee(Employee v){
    employee=v;
} 
public String getPermission(){
    return permission;
} 
public void setPermission(String v){
    permission=v;
} 
public String getScopeType(){
    return scopeType;
} 
public void setScopeType(String v){
    scopeType=v;
} 
public String getScopeValue(){
    return scopeValue;
} public void setScopeValue(String v){
    scopeValue=v;
} 
public boolean isActive(){
    return active;
} 
public void setActive(boolean v){
    active=v;
}
}
