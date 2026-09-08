package com.ems.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_work_reports", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"employee_id", "report_date"})
})
public class DailyWorkReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "tasks_completed", nullable = false, columnDefinition = "TEXT")
    private String tasksCompleted;

    @Column(name = "blockers", nullable = false, columnDefinition = "TEXT")
    private String blockers = "None";

    @Column(name = "plan_for_tomorrow", nullable = false, columnDefinition = "TEXT")
    private String planForTomorrow;

    @Column(name = "equipments_used", columnDefinition = "TEXT")
    private String equipmentsUsed;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (blockers == null || blockers.isBlank()) {
            blockers = "None";
        }
    }

    public DailyWorkReport() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Employee getEmployee() { return employee; }
    public void setEmployee(Employee employee) { this.employee = employee; }

    public LocalDate getReportDate() { return reportDate; }
    public void setReportDate(LocalDate reportDate) { this.reportDate = reportDate; }

    public String getTasksCompleted() { return tasksCompleted; }
    public void setTasksCompleted(String tasksCompleted) { this.tasksCompleted = tasksCompleted; }

    public String getBlockers() { return blockers; }
    public void setBlockers(String blockers) { this.blockers = blockers; }

    public String getPlanForTomorrow() { return planForTomorrow; }
    public void setPlanForTomorrow(String planForTomorrow) { this.planForTomorrow = planForTomorrow; }

    public String getEquipmentsUsed() { return equipmentsUsed; }
    public void setEquipmentsUsed(String equipmentsUsed) { this.equipmentsUsed = equipmentsUsed; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
