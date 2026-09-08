package com.ems.repository;

import com.ems.model.DailyWorkReport;
import com.ems.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyWorkReportRepository extends JpaRepository<DailyWorkReport, Long> {

    List<DailyWorkReport> findByEmployeeEmployeeIdOrderByReportDateDesc(String employeeId);

    Optional<DailyWorkReport> findByEmployeeEmployeeIdAndReportDate(String employeeId, LocalDate reportDate);

    List<DailyWorkReport> findAllByOrderByReportDateDescCreatedAtDesc();

    List<DailyWorkReport> findByReportDateBetweenOrderByReportDateDescCreatedAtDesc(LocalDate from, LocalDate to);

    List<DailyWorkReport> findByEmployeeEmployeeIdAndReportDateBetweenOrderByReportDateDesc(String employeeId, LocalDate from, LocalDate to);

    List<DailyWorkReport> findByReportDateOrderByCreatedAtDesc(LocalDate reportDate);
}
