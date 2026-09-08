package com.ems.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "organization_holidays", uniqueConstraints = @UniqueConstraint(columnNames = {"holiday_date"}),
       indexes = @Index(name = "idx_org_holiday_date", columnList = "holiday_date"))
public class OrganizationHoliday {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 160) private String name;
    @Column(name = "holiday_date", nullable = false) private LocalDate holidayDate;
    @Column(length = 1000) private String description;
    @Column(nullable = false, length = 50) private String type = "PUBLIC";
    @Column(nullable = false) private boolean recurring = false;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();
    @Column(name = "created_by") private String createdBy;
    @Column(name = "updated_by") private String updatedBy;

    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;}
    public LocalDate getHolidayDate(){return holidayDate;} public void setHolidayDate(LocalDate v){holidayDate=v;}
    public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public String getType(){return type;} public void setType(String v){type=v;}
    public boolean isRecurring(){return recurring;} public void setRecurring(boolean v){recurring=v;}
    public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
    public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getUpdatedAt(){return updatedAt;}
    public String getCreatedBy(){return createdBy;} public void setCreatedBy(String v){createdBy=v;}
    public String getUpdatedBy(){return updatedBy;} public void setUpdatedBy(String v){updatedBy=v;}
}
