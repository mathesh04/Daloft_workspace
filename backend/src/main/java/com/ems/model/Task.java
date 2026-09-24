package com.ems.model;

import com.ems.util.TimeUtil;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Employee assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Employee assignedBy;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskStatus status = TaskStatus.PENDING;

    @Column(name="assignment_type", nullable=false)
    private String assignmentType = "EMPLOYEE";

    @Column(name="target_department")
    private String targetDepartment;

    @Column(name="target_role")
    private String targetRole;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = TimeUtil.now();

    public Task() {}

    public enum TaskStatus {
        PENDING, IN_PROGRESS, COMPLETED
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Employee getAssignedTo() { return assignedTo; }
    public void setAssignedTo(Employee assignedTo) { this.assignedTo = assignedTo; }

    public Employee getAssignedBy() { return assignedBy; }
    public void setAssignedBy(Employee assignedBy) { this.assignedBy = assignedBy; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getAssignmentType() { return assignmentType; }
    public void setAssignmentType(String v) { assignmentType=v; }
    public String getTargetDepartment() { return targetDepartment; }
    public void setTargetDepartment(String v) { targetDepartment=v; }
    public String getTargetRole() { return targetRole; }
    public void setTargetRole(String v) { targetRole=v; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

