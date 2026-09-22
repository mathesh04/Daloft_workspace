package com.ems.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_categories", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class InventoryCategory {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) 
 private String name;
 @Column(length=1000) 
 private String description;
 @Column(name="created_at", updatable=false) 
 private LocalDateTime createdAt=LocalDateTime.now();
 public Long getId(){
    return id;
} 
public void setId(Long id){this.id=id;} 
public String getName(){return name;} 
public void setName(String name){
    this.name=name;
} 
public String getDescription(){
    return description;
} 
public void setDescription(String description){
    this.description=description;
} 
public LocalDateTime getCreatedAt(){return createdAt;

} public void setCreatedAt(LocalDateTime createdAt){
    this.createdAt=createdAt;
}
}
