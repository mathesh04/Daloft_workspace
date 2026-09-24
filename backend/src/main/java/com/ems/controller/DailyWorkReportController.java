package com.ems.controller;

import com.ems.util.TimeUtil;

import com.ems.model.DailyWorkReport;
import com.ems.service.DailyWorkReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class DailyWorkReportController {

    private final DailyWorkReportService reportService;

    public DailyWorkReportController(DailyWorkReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping("/api/daily-reports")
    public ResponseEntity<?> submitReport(Authentication auth, @RequestBody Map<String, String> body) {
        try {
            String dateStr = body.get("reportDate");
            LocalDate date = (dateStr != null && !dateStr.isBlank()) ? LocalDate.parse(dateStr) : TimeUtil.today();

            String tasks = body.get("tasksCompleted");
            String blockers = body.get("blockers");
            String plan = body.get("planForTomorrow");
            String equipment = body.get("equipmentsUsed");

            DailyWorkReport report = reportService.submitReport(auth.getName(), date, tasks, blockers, plan, equipment);
            return ResponseEntity.status(201).body(report);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to submit report: " + e.getMessage()));
        }
    }

    @GetMapping("/api/daily-reports/me")
    public List<DailyWorkReport> myReports(Authentication auth) {
        return reportService.getMyReports(auth.getName());
    }

    @GetMapping("/api/daily-reports/today")
    public ResponseEntity<?> myReportToday(Authentication auth) {
        Optional<DailyWorkReport> report = reportService.getMyReportForDate(auth.getName(), TimeUtil.today());
        return ResponseEntity.ok(report.orElse(null));
    }

    @GetMapping("/api/admin/daily-reports")
    public List<DailyWorkReport> getFilteredReports(
            @RequestParam(required = false) String employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.getFilteredReports(employeeId, from, to);
    }

    @GetMapping("/api/admin/daily-reports/employees")
    public List<Map<String, Object>> getEmployeeRosterSummary() {
        return reportService.getEmployeeSummaryRoster();
    }

    @GetMapping("/api/admin/daily-reports/export/employee-wise")
    public ResponseEntity<byte[]> exportEmployeeWiseExcel(
            @RequestParam(required = false) String employeeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) throws Exception {
        
        byte[] bytes = reportService.exportEmployeeWiseExcel(employeeId, from, to);
        String filename = "employee-work-report-" + (employeeId != null ? employeeId : "all") + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/api/admin/daily-reports/export/date-wise")
    public ResponseEntity<byte[]> exportDateWiseExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) throws Exception {
        
        byte[] bytes = reportService.exportDateWiseExcel(date, from, to);
        String filename = "daily-work-report-" + (date != null ? date : (from != null ? from + "-to-" + to : TimeUtil.today())) + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }
}

