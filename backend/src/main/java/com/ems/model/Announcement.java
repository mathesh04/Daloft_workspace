package com.ems.model;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDateTime;

@Entity
@Table(name = "announcements")
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(name = "target_type", nullable = false)
    private String targetType = "ALL";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "posted_by")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Employee postedBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Announcement() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = (targetType == null || targetType.isBlank()) ? "ALL" : targetType.trim().toUpperCase(); }

    public Employee getPostedBy() { return postedBy; }
    public void setPostedBy(Employee postedBy) { this.postedBy = postedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
