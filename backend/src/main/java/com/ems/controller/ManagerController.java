package com.ems.controller;

import com.ems.model.*;
import com.ems.dto.EmployeeResponse;
import com.ems.dto.LeaveRequestResponse;
import com.ems.dto.DepartmentResponse;
import com.ems.dto.ManagerDepartmentResponse;
import com.ems.repository.*;
import com.ems.service.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/manager")
public class ManagerController {

    private final EmployeeRepository employees;
    private final AttendanceRepository attendance;
    private final DepartmentRepository departments;
    private final LeaveRequestRepository leaves;
    private final NotificationService notifications;
    private final AuditService audit;
    private final SystemSettingsService settings;
    private final LeaveBalanceService balanceService;
    private final AttendanceRegularizationService regularization;
    private final DailyWorkReportRepository reportRepository;
    private final DailyWorkReportService reportService;

    public ManagerController(
            EmployeeRepository e,
            AttendanceRepository at,
            DepartmentRepository d,
            LeaveRequestRepository l,
            NotificationService n,
            AuditService a,
            SystemSettingsService s,
            LeaveBalanceService bs,
            AttendanceRegularizationService ar,
            DailyWorkReportRepository rr,
            DailyWorkReportService rs) {

        employees = e;
        attendance = at;
        departments = d;
        leaves = l;
        notifications = n;
        audit = a;
        settings = s;
        balanceService = bs;
        regularization = ar;
        reportRepository = rr;
        reportService = rs;
    }

    private Employee me(Authentication a) {
        Employee e = employees
                .findByEmployeeId(a.getName())
                .orElseThrow();

        if (e.getRole() != Role.MANAGER) {
            throw new SecurityException("Manager access required");
        }

        return e;
    }

    private boolean departmentMatches(Employee employee, Department department) {
        if (employee == null || department == null || employee.getDepartment() == null) {
            return false;
        }
        String normalized = employee.getDepartment().trim();
        return (department.getName() != null && department.getName().trim().equalsIgnoreCase(normalized))
                || (department.getCode() != null && department.getCode().trim().equalsIgnoreCase(normalized));
    }

    private boolean manages(Employee m, Employee e) {
        if (m == null || e == null) {
            return false;
        }

        if (e.getReportingManager() != null
                && Objects.equals(e.getReportingManager().getId(), m.getId())) {
            return true;
        }

        return departments
                .findByManagerId(m.getId())
                .stream()
                .filter(Department::isActive)
                .anyMatch(d -> departmentMatches(e, d));
    }

    @GetMapping("/team")
    public List<EmployeeResponse> team(
            @RequestParam(required = false) Long departmentId,
            Authentication a) {

        Employee m = me(a);

        List<Department> managedDepartments = departments.findByManagerId(m.getId())
                .stream()
                .filter(Department::isActive)
                .toList();

        Department targetDept = null;
        if (departmentId != null) {
            targetDept = managedDepartments.stream()
                    .filter(d -> Objects.equals(d.getId(), departmentId))
                    .findFirst()
                    .orElseThrow(() -> new SecurityException("Department not managed by you"));
        }
        final Department scopedDept = targetDept;

        return employees.findAll()
                .stream()
                .filter(e ->
                        (e.getRole() == Role.EMPLOYEE || e.getRole() == Role.INTERN)
                                && !Objects.equals(e.getId(), m.getId())
                                && manages(m, e)
                )
                .filter(e -> {
                    if (scopedDept == null) return true;
                    return departmentMatches(e, scopedDept);
                })
                .sorted(Comparator.comparing(Employee::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(EmployeeResponse::new)
                .toList();
    }

    @GetMapping("/departments")
    public List<ManagerDepartmentResponse> departments(Authentication a) {

        Employee m = me(a);

        List<Department> managedList = departments
                .findByManagerId(m.getId())
                .stream()
                .filter(Department::isActive)
                .sorted(Comparator.comparing(Department::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();

        List<Employee> allEmployees = employees.findAll();

        return managedList.stream().map(d -> {
            List<Employee> deptEmployees = allEmployees.stream()
                    .filter(e -> (e.getRole() == Role.EMPLOYEE || e.getRole() == Role.INTERN)
                            && !Objects.equals(e.getId(), m.getId())
                            && departmentMatches(e, d))
                    .toList();
            long total = deptEmployees.size();
            long active = deptEmployees.stream().filter(Employee::isActive).count();

            return new ManagerDepartmentResponse(
                    d.getId(),
                    d.getName(),
                    d.getCode(),
                    d.getManager() == null ? null : d.getManager().getId(),
                    d.getManager() == null ? null : d.getManager().getName(),
                    d.isActive(),
                    total,
                    active
            );
        }).toList();
    }

    @GetMapping("/attendance")
    public List<Attendance> attendance(
            @RequestParam(defaultValue = "31") int days,
            Authentication a) {

        Employee m = me(a);

        int safe = Math.max(1, Math.min(days, 90));

        LocalDate start =
                settings.today().minusDays(safe - 1);

        return attendance
                .findAllByOrderByWorkDateDescCheckInTimeDesc()
                .stream()
                .filter(x ->
                        x.getWorkDate() != null
                                && !x.getWorkDate().isBefore(start)
                )
                .filter(x ->
                        x.getEmployee() != null
                                && x.getEmployee().isActive()
                                && !Objects.equals(x.getEmployee().getId(), m.getId())
                                && manages(m, x.getEmployee())
                )
                .toList();
    }

    @GetMapping("/leaves")
    public List<LeaveRequestResponse> leaves(Authentication a) {

        Employee m = me(a);

        return leaves
                .findByStatusOrderByCreatedAtAsc(LeaveStatus.PENDING)
                .stream()
                .filter(r -> manages(m, r.getEmployee()))
                .map(LeaveRequestResponse::new)
                .toList();
    }

    @PutMapping("/leaves/{id}/status")
    public ResponseEntity<?> review(
            @PathVariable Long id,
            @RequestBody Map<String, String> b,
            Authentication a) {

        try {

            Employee m = me(a);

            LeaveRequest r = leaves
                    .findById(id)
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Leave request not found"
                            ));

            if (!manages(m, r.getEmployee())) {
                throw new SecurityException(
                        "You can only review your team's leave requests"
                );
            }

            if (r.getStatus() != LeaveStatus.PENDING) {
                throw new IllegalArgumentException(
                        "Only pending leave requests can be reviewed by a manager"
                );
            }

            String st = String.valueOf(
                    b.getOrDefault("status", "")
            ).toUpperCase();

            if (!st.equals("APPROVED")
                    && !st.equals("REJECTED")) {

                throw new IllegalArgumentException(
                        "Status must be APPROVED or REJECTED"
                );
            }

            String reason = String.valueOf(
                    b.getOrDefault("reason", "")
            ).trim();

            if (st.equals("REJECTED")
                    && reason.isBlank()) {

                throw new IllegalArgumentException(
                        "A rejection reason is required"
                );
            }

           
            if (st.equals("APPROVED")) {

                balanceService.reserveOnApproval(r);

            } else {

               
                r.setRejectionReason(reason);
            }

            r.setStatus(
                    LeaveStatus.valueOf(st)
            );

            LeaveRequest saved =
                    leaves.save(r);

           

            String msg;

            
            if (st.equals("APPROVED")) {

                msg =
                        "Dear " + saved.getEmployee().getName() + ",\n\n" +

                                "Your leave request has been reviewed and approved by your reporting manager.\n\n" +

                                "Leave Details\n" +
                                "----------------------------------------\n" +
                                "Leave Type       : " + saved.getLeaveType() + "\n" +
                                "Start Date       : " + saved.getStartDate() + "\n" +
                                "End Date         : " + saved.getEndDate() + "\n" +
                                "Working Days     : " + saved.getWorkingDays() + "\n" +
                                "Status           : APPROVED\n" +
                                "----------------------------------------\n\n" +

                                "Please ensure that any pending tasks, responsibilities, or required handovers " +
                                "are completed or communicated to your team before the start of your leave.\n\n" +

                                "Your leave record has been updated in the DALOFT People platform.\n\n" +

                                "We wish you a pleasant and restful leave.\n\n" +

                                "Warm regards,\n" +
                                "HR & People Operations\n" +
                                "DALOFT AEROSPACE PRIVATE LIMITED";

                notifications.create(
                        saved.getEmployee(),
                        "DALOFT AEROSPACE | Leave Request Approved",
                        msg,
                        "LEAVE",
                        true
                );

            }

            
            else {

                msg =
                        "Dear " + saved.getEmployee().getName() + ",\n\n" +

                                "Your leave request has been reviewed and could not be approved at this time.\n\n" +

                                "Leave Details\n" +
                                "----------------------------------------\n" +
                                "Leave Type       : " + saved.getLeaveType() + "\n" +
                                "Start Date       : " + saved.getStartDate() + "\n" +
                                "End Date         : " + saved.getEndDate() + "\n" +
                                "Working Days     : " + saved.getWorkingDays() + "\n" +
                                "Status           : NOT APPROVED\n" +
                                "----------------------------------------\n\n" +

                                "Manager / HR Remarks\n" +
                                "----------------------------------------\n" +

                                (reason.isBlank()
                                        ? "No additional remarks were provided."
                                        : reason) +

                                "\n----------------------------------------\n\n" +

                                "Please review the above information. If you require clarification or wish to discuss " +
                                "the request, please contact your reporting manager or HR & People Operations team.\n\n" +

                                "Your leave record has been updated in the DALOFT People platform.\n\n" +

                                "Warm regards,\n" +
                                "HR & People Operations\n" +
                                "DALOFT AEROSPACE PRIVATE LIMITED";

                notifications.create(
                        saved.getEmployee(),
                        "DALOFT AEROSPACE | Leave Request Update",
                        msg,
                        "LEAVE",
                        true
                );
            }

            audit.log(
                    a,
                    "LEAVE_MANAGER_DECISION",
                    "Manager " +
                            st.toLowerCase() +
                            " leave request " +
                            id,
                    "LEAVE",
                    id,
                    "SUCCESS",
                    null,
                    reason.isBlank()
                            ? null
                            : reason
            );

            return ResponseEntity.ok(
                    new LeaveRequestResponse(saved)
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            e instanceof SecurityException
                                    ? 403
                                    : 400
                    )
                    .body(
                            Map.of(
                                    "message",
                                    e.getMessage()
                            )
                    );
        }
    }

    @GetMapping("/attendance-corrections")
    public List<AttendanceRegularizationRequest> corrections(
            Authentication a) {

        Employee m = me(a);

        return regularization.pendingForManager(m);
    }

    @PutMapping("/attendance-corrections/{id}/status")
    public ResponseEntity<?> correctionStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication a) {

        try {

            return ResponseEntity.ok(
                    regularization.review(
                            id,
                            body.get("status"),
                            body.get("reason"),
                            a,
                            me(a)
                    )
            );

        } catch (Exception e) {

            return ResponseEntity
                    .status(
                            e instanceof SecurityException
                                    ? 403
                                    : 400
                    )
                    .body(
                            Map.of(
                                    "message",
                                    e.getMessage()
                            )
                    );
        }
    }

    @GetMapping("/daily-reports")
    public List<DailyWorkReport> dailyReports(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String employeeId,
            @RequestParam(required = false) Long departmentId,
            Authentication a) {

        Employee m = me(a);
        return getScopedDailyReports(m, date, from, to, employeeId, departmentId);
    }

    @GetMapping("/daily-reports/employees")
    public List<Map<String, Object>> dailyReportEmployees(Authentication a) {
        Employee m = me(a);
        return employees.findAll().stream()
                .filter(e -> (e.getRole() == Role.EMPLOYEE || e.getRole() == Role.INTERN)
                        && !Objects.equals(e.getId(), m.getId())
                        && manages(m, e))
                .sorted(Comparator.comparing(Employee::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(e -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", e.getId());
                    map.put("employeeId", e.getEmployeeId());
                    map.put("name", e.getName());
                    map.put("department", e.getDepartment());
                    map.put("role", e.getRole().name());
                    map.put("active", e.isActive());
                    return map;
                })
                .toList();
    }

    @GetMapping("/daily-reports/export")
    public ResponseEntity<byte[]> exportDailyReports(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String employeeId,
            @RequestParam(required = false) Long departmentId,
            Authentication a) throws Exception {

        Employee m = me(a);
        List<DailyWorkReport> list = getScopedDailyReports(m, date, from, to, employeeId, departmentId);
        byte[] excel = reportService.exportReportsToExcel(list, "Daily Reports - " + m.getName());
        String filename = "daily-work-reports-" + (date != null ? date : (from != null ? from + "-to-" + to : "all")) + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excel);
    }

    private List<DailyWorkReport> getScopedDailyReports(
            Employee m,
            LocalDate date,
            LocalDate from,
            LocalDate to,
            String employeeId,
            Long departmentId) {

        List<Department> managedDepartments = departments.findByManagerId(m.getId())
                .stream()
                .filter(Department::isActive)
                .toList();

        Department targetDept = null;
        if (departmentId != null) {
            targetDept = managedDepartments.stream()
                    .filter(d -> Objects.equals(d.getId(), departmentId))
                    .findFirst()
                    .orElseThrow(() -> new SecurityException("Department not managed by you"));
        }
        final Department scopedDept = targetDept;

        LocalDate startDate = date != null ? date : from;
        LocalDate endDate = date != null ? date : to;

        List<DailyWorkReport> list;
        if (startDate != null && endDate != null) {
            list = reportRepository.findByReportDateBetweenOrderByReportDateDescCreatedAtDesc(startDate, endDate);
        } else if (startDate != null) {
            list = reportRepository.findByReportDateBetweenOrderByReportDateDescCreatedAtDesc(startDate, LocalDate.now());
        } else {
            list = reportRepository.findAllByOrderByReportDateDescCreatedAtDesc();
        }

        final String reqEmpId = (employeeId != null && !employeeId.isBlank()) ? employeeId.trim() : null;

        return list.stream()
                .filter(r -> r.getEmployee() != null
                        && !Objects.equals(r.getEmployee().getId(), m.getId())
                        && manages(m, r.getEmployee()))
                .filter(r -> {
                    if (scopedDept == null) return true;
                    return departmentMatches(r.getEmployee(), scopedDept);
                })
                .filter(r -> {
                    if (reqEmpId == null) return true;
                    return r.getEmployee().getEmployeeId().equalsIgnoreCase(reqEmpId);
                })
                .toList();
    }
}
