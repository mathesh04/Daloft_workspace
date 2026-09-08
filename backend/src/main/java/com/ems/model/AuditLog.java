package com.ems.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable=false) private String actor;
    @Column(nullable=false) private String action;
    @Column(length=2000) private String details;
    @Column(name="actor_employee_id") private String actorEmployeeId;
    @Column(name="actor_role") private String actorRole;
    @Column(name="entity_type") private String entityType;
    @Column(name="entity_id") private String entityId;
    @Column private String status;
    @Column(name="ip_address") private String ipAddress;
    @Column(name="created_at", nullable=false) private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId(){return id;}
    public String getActor(){return actor;}
    public void setActor(String v){actor=v;}
    public String getAction(){return action;}
    public void setAction(String v){action=v;}
    public String getDetails(){return details;}
    public void setDetails(String v){details=v;}
    public String getActorEmployeeId(){return actorEmployeeId;} public void setActorEmployeeId(String v){actorEmployeeId=v;}
    public String getActorRole(){return actorRole;} public void setActorRole(String v){actorRole=v;}
    public String getEntityType(){return entityType;} public void setEntityType(String v){entityType=v;}
    public String getEntityId(){return entityId;} public void setEntityId(String v){entityId=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getIpAddress(){return ipAddress;} public void setIpAddress(String v){ipAddress=v;}
    public LocalDateTime getCreatedAt(){return createdAt;}
}
