package com.ems.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity @Table(name="system_settings")
public class SystemSetting { @Id @Column(name="setting_key",length=120) private String key; @Column(name="setting_value",length=4000) private String value; @Column(length=500) private String description; private LocalDateTime updatedAt=LocalDateTime.now(); public String getKey(){return key;} public void setKey(String v){key=v;} public String getValue(){return value;} public void setValue(String v){value=v;} public String getDescription(){return description;} public void setDescription(String v){description=v;} public LocalDateTime getUpdatedAt(){return updatedAt;} @PreUpdate @PrePersist void touch(){updatedAt=LocalDateTime.now();} }
