package com.ems.service;

import com.ems.util.TimeUtil;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.model.DailyWorkReport;
import com.ems.model.Employee;
import com.ems.repository.DailyWorkReportRepository;
import com.ems.repository.EmployeeRepository;

@Service
public class DailyWorkReportService {

    private final DailyWorkReportRepository reportRepository;
    private final EmployeeRepository employeeRepository;
    private final NotificationService notificationService;

    public DailyWorkReportService(DailyWorkReportRepository reportRepository,
                                  EmployeeRepository employeeRepository,
                                  NotificationService notificationService) {
        this.reportRepository = reportRepository;
        this.employeeRepository = employeeRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public DailyWorkReport submitReport(String employeeId, LocalDate reportDate, String tasksCompleted, String blockers, String planForTomorrow, String equipmentsUsed) {
        if (tasksCompleted == null || tasksCompleted.isBlank()) {
            throw new IllegalArgumentException("Tasks completed or learnings cannot be empty.");
        }
        if (planForTomorrow == null || planForTomorrow.isBlank()) {
            throw new IllegalArgumentException("Plan for tomorrow cannot be empty.");
        }

        Employee emp = employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + employeeId));

        LocalDate date = (reportDate != null) ? reportDate : TimeUtil.today();

        Optional<DailyWorkReport> existing = reportRepository.findByEmployeeEmployeeIdAndReportDate(emp.getEmployeeId(), date);
        if (existing.isPresent()) {
            throw new IllegalStateException("You have already submitted a daily work report for " + date + ".");
        }

        DailyWorkReport report = new DailyWorkReport();
        report.setEmployee(emp);
        report.setReportDate(date);
        report.setTasksCompleted(tasksCompleted.trim());
        report.setBlockers((blockers != null && !blockers.isBlank()) ? blockers.trim() : "None");
        report.setPlanForTomorrow(planForTomorrow.trim());
        report.setEquipmentsUsed((equipmentsUsed != null && !equipmentsUsed.isBlank()) ? equipmentsUsed.trim() : "N/A");

        DailyWorkReport saved = reportRepository.save(report);

        try {
            notificationService.notifyAdmins(
                    "Daily Work Report Submitted",
                    "Employee " + emp.getName() + " (" + emp.getEmployeeId() + ") submitted daily report for " + date + ".",
                    "DAILY_REPORT"
            );
        } catch (Exception ignored) {
            
        }

        return saved;
    }

    public List<DailyWorkReport> getMyReports(String employeeId) {
        return reportRepository.findByEmployeeEmployeeIdOrderByReportDateDesc(employeeId);
    }

    public Optional<DailyWorkReport> getMyReportForDate(String employeeId, LocalDate date) {
        return reportRepository.findByEmployeeEmployeeIdAndReportDate(employeeId, date);
    }

    public List<DailyWorkReport> getFilteredReports(String employeeId, LocalDate from, LocalDate to) {
        boolean hasEmp = employeeId != null && !employeeId.isBlank();
        boolean hasFrom = from != null;
        boolean hasTo = to != null;

        if (hasEmp && hasFrom && hasTo) {
            return reportRepository.findByEmployeeEmployeeIdAndReportDateBetweenOrderByReportDateDesc(employeeId.trim(), from, to);
        } else if (hasEmp && !hasFrom && !hasTo) {
            return reportRepository.findByEmployeeEmployeeIdOrderByReportDateDesc(employeeId.trim());
        } else if (!hasEmp && hasFrom && hasTo) {
            return reportRepository.findByReportDateBetweenOrderByReportDateDescCreatedAtDesc(from, to);
        } else if (!hasEmp && hasFrom && !hasTo) {
            return reportRepository.findByReportDateBetweenOrderByReportDateDescCreatedAtDesc(from, TimeUtil.today());
        } else {
            return reportRepository.findAllByOrderByReportDateDescCreatedAtDesc();
        }
    }

    public List<Map<String, Object>> getEmployeeSummaryRoster() {
        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(Employee::isActive)
                .sorted(Comparator.comparing(Employee::getName))
                .toList();

        List<Map<String, Object>> summary = new ArrayList<>();
        for (Employee emp : employees) {
            List<DailyWorkReport> reports = reportRepository.findByEmployeeEmployeeIdOrderByReportDateDesc(emp.getEmployeeId());
            Map<String, Object> map = new HashMap<>();
            map.put("id", emp.getId());
            map.put("employeeId", emp.getEmployeeId());
            map.put("name", emp.getName());
            map.put("department", emp.getDepartment() != null ? emp.getDepartment() : "—");
            map.put("role", emp.getRole() != null ? emp.getRole().name() : "EMPLOYEE");
            map.put("totalReports", reports.size());
            map.put("lastReportDate", reports.isEmpty() ? null : reports.get(0).getReportDate().toString());
            summary.add(map);
        }
        return summary;
    }

    public byte[] exportEmployeeWiseExcel(String employeeId, LocalDate from, LocalDate to) throws Exception {
        List<DailyWorkReport> reports = getFilteredReports(employeeId, from, to);

        Employee emp = null;
        if (employeeId != null && !employeeId.isBlank()) {
            emp = employeeRepository.findByEmployeeId(employeeId.trim()).orElse(null);
        }

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            String sheetName = (emp != null) ? emp.getName().replaceAll("[^a-zA-Z0-9 ]", "") : "Employee Reports";
            if (sheetName.length() > 30) sheetName = sheetName.substring(0, 30);
            XSSFSheet sheet = wb.createSheet(sheetName);

            // Styling
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            CellStyle wrapStyle = wb.createCellStyle();
            wrapStyle.setWrapText(true);
            wrapStyle.setVerticalAlignment(VerticalAlignment.TOP);

            String[] headers = {"Date", "Employee ID", "Employee Name", "Department", "Tasks Completed / Learnings", "Blockers / Issues", "Plan for Tomorrow", "Equipment Used", "Submitted At"};
            XSSFRow headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            DateTimeFormatter dtFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (DailyWorkReport r : reports) {
                XSSFRow row = sheet.createRow(rowIdx++);
                Employee e = r.getEmployee();

                row.createCell(0).setCellValue(String.valueOf(r.getReportDate()));
                row.createCell(1).setCellValue(e != null ? e.getEmployeeId() : "");
                row.createCell(2).setCellValue(e != null ? e.getName() : "");
                row.createCell(3).setCellValue((e != null && e.getDepartment() != null) ? e.getDepartment() : "");

                Cell c4 = row.createCell(4); c4.setCellValue(r.getTasksCompleted()); c4.setCellStyle(wrapStyle);
                Cell c5 = row.createCell(5); c5.setCellValue(r.getBlockers()); c5.setCellStyle(wrapStyle);
                Cell c6 = row.createCell(6); c6.setCellValue(r.getPlanForTomorrow()); c6.setCellStyle(wrapStyle);
                Cell c7 = row.createCell(7); c7.setCellValue(r.getEquipmentsUsed() != null ? r.getEquipmentsUsed() : ""); c7.setCellStyle(wrapStyle);

                row.createCell(8).setCellValue(r.getCreatedAt() != null ? r.getCreatedAt().format(dtFmt) : "");
            }

            sheet.setColumnWidth(0, 3500);
            sheet.setColumnWidth(1, 3500);
            sheet.setColumnWidth(2, 5500);
            sheet.setColumnWidth(3, 4500);
            sheet.setColumnWidth(4, 12000);
            sheet.setColumnWidth(5, 8000);
            sheet.setColumnWidth(6, 12000);
            sheet.setColumnWidth(7, 6000);
            sheet.setColumnWidth(8, 4500);

            wb.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportDateWiseExcel(LocalDate date, LocalDate from, LocalDate to) throws Exception {
        LocalDate startDate = (date != null) ? date : ((from != null) ? from : TimeUtil.today());
        LocalDate endDate = (date != null) ? date : ((to != null) ? to : TimeUtil.today());

        List<DailyWorkReport> reports = reportRepository.findByReportDateBetweenOrderByReportDateDescCreatedAtDesc(startDate, endDate);

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            String title = (startDate.equals(endDate)) ? "Date " + startDate : "Range " + startDate + " to " + endDate;
            XSSFSheet sheet = wb.createSheet(title.replaceAll("[^a-zA-Z0-9 ]", ""));

            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            CellStyle wrapStyle = wb.createCellStyle();
            wrapStyle.setWrapText(true);
            wrapStyle.setVerticalAlignment(VerticalAlignment.TOP);

            String[] headers = {"Date", "Employee ID", "Employee Name", "Department", "Tasks Completed / Learnings", "Blockers / Issues", "Plan for Tomorrow", "Equipment Used", "Submitted At"};
            XSSFRow headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            DateTimeFormatter dtFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (DailyWorkReport r : reports) {
                XSSFRow row = sheet.createRow(rowIdx++);
                Employee e = r.getEmployee();

                row.createCell(0).setCellValue(String.valueOf(r.getReportDate()));
                row.createCell(1).setCellValue(e != null ? e.getEmployeeId() : "");
                row.createCell(2).setCellValue(e != null ? e.getName() : "");
                row.createCell(3).setCellValue((e != null && e.getDepartment() != null) ? e.getDepartment() : "");

                Cell c4 = row.createCell(4); c4.setCellValue(r.getTasksCompleted()); c4.setCellStyle(wrapStyle);
                Cell c5 = row.createCell(5); c5.setCellValue(r.getBlockers()); c5.setCellStyle(wrapStyle);
                Cell c6 = row.createCell(6); c6.setCellValue(r.getPlanForTomorrow()); c6.setCellStyle(wrapStyle);
                Cell c7 = row.createCell(7); c7.setCellValue(r.getEquipmentsUsed() != null ? r.getEquipmentsUsed() : ""); c7.setCellStyle(wrapStyle);

                row.createCell(8).setCellValue(r.getCreatedAt() != null ? r.getCreatedAt().format(dtFmt) : "");
            }

            sheet.setColumnWidth(0, 3500);
            sheet.setColumnWidth(1, 3500);
            sheet.setColumnWidth(2, 5500);
            sheet.setColumnWidth(3, 4500);
            sheet.setColumnWidth(4, 12000);
            sheet.setColumnWidth(5, 8000);
            sheet.setColumnWidth(6, 12000);
            sheet.setColumnWidth(7, 6000);
            sheet.setColumnWidth(8, 4500);

            wb.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportReportsToExcel(List<DailyWorkReport> reports, String title) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            String safeTitle = (title != null && !title.isBlank()) ? title.replaceAll("[^a-zA-Z0-9 ]", "") : "Daily Reports";
            XSSFSheet sheet = wb.createSheet(safeTitle.length() > 30 ? safeTitle.substring(0, 30) : safeTitle);

            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            CellStyle wrapStyle = wb.createCellStyle();
            wrapStyle.setWrapText(true);
            wrapStyle.setVerticalAlignment(VerticalAlignment.TOP);

            String[] headers = {"Date", "Employee ID", "Employee Name", "Department", "Tasks Completed / Learnings", "Blockers / Issues", "Plan for Tomorrow", "Equipment Used", "Submitted At"};
            XSSFRow headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            DateTimeFormatter dtFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (DailyWorkReport r : reports) {
                XSSFRow row = sheet.createRow(rowIdx++);
                Employee e = r.getEmployee();

                row.createCell(0).setCellValue(String.valueOf(r.getReportDate()));
                row.createCell(1).setCellValue(e != null ? e.getEmployeeId() : "");
                row.createCell(2).setCellValue(e != null ? e.getName() : "");
                row.createCell(3).setCellValue((e != null && e.getDepartment() != null) ? e.getDepartment() : "");

                Cell c4 = row.createCell(4); c4.setCellValue(r.getTasksCompleted()); c4.setCellStyle(wrapStyle);
                Cell c5 = row.createCell(5); c5.setCellValue(r.getBlockers()); c5.setCellStyle(wrapStyle);
                Cell c6 = row.createCell(6); c6.setCellValue(r.getPlanForTomorrow()); c6.setCellStyle(wrapStyle);
                Cell c7 = row.createCell(7); c7.setCellValue(r.getEquipmentsUsed() != null ? r.getEquipmentsUsed() : ""); c7.setCellStyle(wrapStyle);

                row.createCell(8).setCellValue(r.getCreatedAt() != null ? r.getCreatedAt().format(dtFmt) : "");
            }

            sheet.setColumnWidth(0, 3500);
            sheet.setColumnWidth(1, 3500);
            sheet.setColumnWidth(2, 5500);
            sheet.setColumnWidth(3, 4500);
            sheet.setColumnWidth(4, 12000);
            sheet.setColumnWidth(5, 8000);
            sheet.setColumnWidth(6, 12000);
            sheet.setColumnWidth(7, 6000);
            sheet.setColumnWidth(8, 4500);

            wb.write(out);
            return out.toByteArray();
        }
    }
}

