package com.ems.model;

import com.ems.util.TimeUtil;
import jakarta.persistence.*; import java.time.*;
@Entity @Table(name="password_reset_tokens", indexes=@Index(name="idx_password_reset_token_hash", columnList="token_hash"))
public class PasswordResetToken {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="employee_id",nullable=false) private Employee employee;
 @Column(name="token_hash",nullable=false,length=128) private String tokenHash;
 @Column(name="expiry_time",nullable=false) private LocalDateTime expiryTime;
 @Column(nullable=false) private boolean used=false;
 @Column(name="created_at",nullable=false) private LocalDateTime createdAt=TimeUtil.now();
 public Long getId(){return id;} public Employee getEmployee(){return employee;} public void setEmployee(Employee v){employee=v;} public String getTokenHash(){return tokenHash;} public void setTokenHash(String v){tokenHash=v;} public LocalDateTime getExpiryTime(){return expiryTime;} public void setExpiryTime(LocalDateTime v){expiryTime=v;} public boolean isUsed(){return used;} public void setUsed(boolean v){used=v;} public LocalDateTime getCreatedAt(){return createdAt;}
}
