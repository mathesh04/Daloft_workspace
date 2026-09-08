package com.ems.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false) private String category = "SYSTEM";
    @Column(nullable = false) private String priority = "MEDIUM";

    @Column(name = "read_status", nullable = false)
    private boolean readStatus = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId(){ return id; }
    public Employee getEmployee(){ return employee; }
    public void setEmployee(Employee e){ employee=e; }
    public String getTitle(){ return title; }
    public void setTitle(String v){ title=v; }
    public String getMessage(){ return message; }
    public void setMessage(String v){ message=v; }
    public String getType(){ return type; }
    public void setType(String v){ type=v; }
    public String getCategory(){return category;} public void setCategory(String v){category=v;} public String getPriority(){return priority;} public void setPriority(String v){priority=v;}
    public boolean isReadStatus(){ return readStatus; }
    public void setReadStatus(boolean v){ readStatus=v; }
    public LocalDateTime getCreatedAt(){ return createdAt; }
    public void setCreatedAt(LocalDateTime v){ createdAt=v; }
}
