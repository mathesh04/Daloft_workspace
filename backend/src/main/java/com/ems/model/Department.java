package com.ems.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity 
@Table(name="departments")
public class Department {
 @Id 
 @GeneratedValue(strategy=GenerationType.IDENTITY) 
 private Long id;
 @Column(nullable=false,unique=true) 
 private String name;
 @Column(unique=true) 
 private String code;
  @ManyToOne(fetch=FetchType.EAGER) 
  @JoinColumn(name="manager_id") 
  private Employee manager;
 @Column(nullable=false) 
 private boolean active=true;
 @Column(name="created_at",nullable=false,updatable=false) 
 private LocalDateTime createdAt=LocalDateTime.now();
 public Long getId(){return id;} 
 public void setId(Long v){id=v;} 
 public String getName(){return name;} 
 public void setName(String v){name=v;} 
 public String getCode(){return code;} 
 public void setCode(String v){code=v;} 
 public Employee getManager(){return manager;} 
 public void setManager(Employee v){manager=v;}
  public boolean isActive(){return active;} 
  public void setActive(boolean v){active=v;} 
  public LocalDateTime getCreatedAt(){return createdAt;}
}
