package com.ems.model;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
@Entity 
@Table(name="inventory_usage_updates") 
public class InventoryUsageUpdate {
    @Id 
    @GeneratedValue(strategy=GenerationType.IDENTITY) 
    private Long id;
    
    @ManyToOne(fetch=FetchType.LAZY) 
    @JoinColumn(name="request_id",nullable=false) 
    private InventoryRequest request;
    
    @ManyToOne(fetch=FetchType.LAZY) 
    @JoinColumn(name="component_id",nullable=false) 
    private Component component;

    @ManyToOne(fetch=FetchType.LAZY) 
    @JoinColumn(name="employee_id",nullable=false) 
    private Employee employee;

    @Column(nullable=false) 
    private Integer quantity;

    @Enumerated(EnumType.STRING) 
    @Column(name="usage_status",nullable=false) 
    private UsageStatus usageStatus;

    private String projectName;

    @Column(length=2000) 
    private String notes;

    @Column(name="created_at",nullable=false) 
    private LocalDateTime createdAt=LocalDateTime.now();
    public Long getId(){
        return id;
    } 
    public InventoryRequest getRequest(){
        return request;
    } 
    public void setRequest(InventoryRequest v){request=v;} 
    public Component getComponent(){return component;} 
    public void setComponent(Component v){component=v;} 
    public Employee getEmployee(){return employee;} 
    public void setEmployee(Employee v){employee=v;} 
    public Integer getQuantity(){return quantity;} 
    public void setQuantity(Integer v){quantity=v;} 
    public UsageStatus getUsageStatus(){return usageStatus;} 
    public void setUsageStatus(UsageStatus v){usageStatus=v;} 
    public String getProjectName(){return projectName;} 
    public void setProjectName(String v){projectName=v;} 
    public String getNotes(){return notes;} 
    public void setNotes(String v){notes=v;} 
    public LocalDateTime getCreatedAt(){return createdAt;}
}
