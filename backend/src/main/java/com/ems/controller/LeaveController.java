package com.ems.controller;

import com.ems.dto.LeaveBalanceResponse;
import com.ems.dto.LeaveRequestResponse;
import com.ems.model.*;
import com.ems.repository.*;
import com.ems.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
public class LeaveController {

    private final LeaveRequestRepository leaves;
    private final EmployeeRepository employees;
    private final DepartmentRepository departments;
    private final NotificationService notifications;
    private final AuditService audit;
    private final HolidayService holidays;
    private final LeaveBalanceService balanceService;
    private final SystemSettingsService settings;

    public LeaveController(
            LeaveRequestRepository l,
            EmployeeRepository e,
            DepartmentRepository d,
            NotificationService n,
            AuditService a,
            HolidayService h,
            LeaveBalanceService bs,
            SystemSettingsService s) {

        leaves = l;
        employees = e;
        departments = d;
        notifications = n;
        audit = a;
        holidays = h;
        balanceService = bs;
        settings = s;
    }

    // =========================================================
    // EMPLOYEE - CREATE LEAVE REQUEST
    // =========================================================

    @PostMapping("/api/leaves")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public LeaveRequestResponse create(
            Authentication a,
            @RequestBody LeaveRequest r) {

        if (r == null) {
            throw new IllegalArgumentException("Leave request data is required");
        }

        if (r.getLeaveType() == null || r.getLeaveType().isBlank()) {
            throw new IllegalArgumentException("Leave type is required");
        }

        r.setLeaveType(
                r.getLeaveType()
                        .trim()
                        .toUpperCase(Locale.ROOT)
        );

        if (r.getStartDate() == null
                || r.getEndDate() == null
                || r.getEndDate().isBefore(r.getStartDate())) {

            throw new IllegalArgumentException("Invalid leave dates");
        }

        if (r.getStartDate().getYear() != r.getEndDate().getYear()) {
            throw new IllegalArgumentException(
                    "Leave requests cannot span calendar years; submit separate requests for each year"
            );
        }

        if (r.getStartDate().isBefore(settings.today())) {
            throw new IllegalArgumentException(
                    "Leave cannot start in the past"
            );
        }

        String reason = r.getReason() == null
                ? ""
                : r.getReason().trim();

        if (reason.isBlank()) {
            throw new IllegalArgumentException("Reason is required");
        }

        if (reason.length() > 2000) {
            throw new IllegalArgumentException(
                    "Reason must be 2000 characters or fewer"
            );
        }

        r.setReason(reason);

        Employee e = employees
                .findByEmployeeId(a.getName())
                .orElseThrow(() ->
                        new IllegalArgumentException("Employee not found")
                );

        if (e.getRole() == Role.SYSTEM_ADMIN) {
            throw new IllegalArgumentException(
                    "Organization Admin accounts do not use employee leave workflow"
            );
        }

        // =====================================================
        // PREVENT OVERLAPPING LEAVE
        // =====================================================

        boolean overlap = leaves
                .findByEmployeeEmployeeIdOrderByCreatedAtDesc(
                        e.getEmployeeId()
                )
                .stream()
                .filter(x ->
                        x.getStatus() == LeaveStatus.PENDING
                                || x.getStatus() == LeaveStatus.APPROVED
                )
                .anyMatch(x ->
                        x.getStartDate() != null
                                && x.getEndDate() != null
                                && !r.getStartDate().isAfter(x.getEndDate())
                                && !r.getEndDate().isBefore(x.getStartDate())
                );

        if (overlap) {
            throw new IllegalArgumentException(
                    "This leave overlaps an existing pending or approved leave request"
            );
        }

        // =====================================================
        // CALCULATE WORKING DAYS
        // =====================================================

        long workingDays = holidays.countWorkingDays(
                r.getStartDate(),
                r.getEndDate()
        );

        if (workingDays <= 0) {
            throw new IllegalArgumentException(
                    "The selected leave range contains no organization working days. " +
                            "Check the organization working-days setting and holiday calendar."
            );
        }

        r.setWorkingDays(Math.toIntExact(workingDays));

        // =====================================================
        // CHECK LEAVE BALANCE
        // =====================================================

        if (balanceService.consumes(r.getLeaveType())) {

            LeaveBalance b = balanceService.ensure(
                    e,
                    r.getLeaveType(),
                    r.getStartDate().getYear()
            );

            if (b.getRemainingDays() < r.getWorkingDays()) {

                throw new IllegalArgumentException(
                        "Insufficient "
                                + r.getLeaveType()
                                + " leave balance. Remaining: "
                                + b.getRemainingDays()
                                + " working days."
                );
            }
        }

        // =====================================================
        // SAVE REQUEST
        // =====================================================

        r.setEmployee(e);
        r.setStatus(LeaveStatus.PENDING);
        r.setRejectionReason(null);
        r.setBalanceApplied(false);

        LeaveRequest saved = leaves.saveAndFlush(r);

        // =====================================================
        // FIND MANAGER
        // =====================================================

        Employee manager = e.getReportingManager();

        if (manager == null && e.getDepartment() != null) {

            manager = departments
                    .findByNameIgnoreCase(e.getDepartment())
                    .map(Department::getManager)
                    .orElse(null);
        }

        // =====================================================
        // MANAGER NOTIFICATION
        // =====================================================

        String message =
                "Dear Manager,\n\n" +

                        e.getName()
                        + " ("
                        + e.getEmployeeId()
                        + ") has submitted a new leave request for your review.\n\n" +

                        "LEAVE DETAILS\n" +
                        "------------------------------\n" +
                        "Employee: " + e.getName() + "\n" +
                        "Employee ID: " + e.getEmployeeId() + "\n" +
                        "Leave Type: " + saved.getLeaveType() + "\n" +
                        "Start Date: " + saved.getStartDate() + "\n" +
                        "End Date: " + saved.getEndDate() + "\n" +
                        "Working Days: " + saved.getWorkingDays() + "\n" +
                        "Reason: " + saved.getReason() + "\n" +
                        "Status: PENDING\n\n" +

                        "Please review this request in DALOFT People and take the appropriate action.\n\n" +

                        "Regards,\n" +
                        "HR & People Operations\n" +
                        "DALOFT AEROSPACE PRIVATE LIMITED";

        if (manager != null
                && manager.isActive()
                && !manager.getId().equals(e.getId())) {

            notifications.create(
                    manager,
                    "DALOFT AEROSPACE | Leave Approval Required",
                    message,
                    "LEAVE",
                    true
            );

        } else {

            notifications.notifyAdmins(
                    "DALOFT AEROSPACE | New Leave Request",
                    message,
                    "LEAVE"
            );
        }

        audit.log(
                a,
                "LEAVE_REQUEST_CREATED",
                "Created leave request " + saved.getId(),
                "LEAVE",
                saved.getId(),
                "SUCCESS",
                null
        );

        return new LeaveRequestResponse(saved);
    }

    // =========================================================
    // EMPLOYEE - CANCEL LEAVE
    // =========================================================

    @PutMapping("/api/leaves/{id}/cancel")
    @Transactional
    public ResponseEntity<?> cancel(
            @PathVariable Long id,
            Authentication auth) {

        try {

            LeaveRequest r = leaves
                    .findById(id)
                    .orElseThrow(() ->
                            new NoSuchElementException(
                                    "Leave request not found"
                            )
                    );

            Employee e = employees
                    .findByEmployeeId(auth.getName())
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Employee not found"
                            )
                    );

            if (r.getEmployee() == null
                    || !r.getEmployee().getId().equals(e.getId())) {

                throw new SecurityException(
                        "You can only cancel your own leave requests"
                );
            }

            if (r.getStatus() != LeaveStatus.PENDING
                    && r.getStatus() != LeaveStatus.APPROVED) {

                throw new IllegalArgumentException(
                        "Only pending or approved leave requests can be cancelled"
                );
            }

            if (r.getStartDate() != null
                    && r.getStartDate().isBefore(settings.today())) {

                throw new IllegalArgumentException(
                        "Past leave cannot be cancelled"
                );
            }

            if (r.getStatus() == LeaveStatus.APPROVED) {
                balanceService.releaseOnReversal(r);
            }

            r.setStatus(LeaveStatus.CANCELLED);
            r.setRejectionReason(null);

            LeaveRequest saved = leaves.saveAndFlush(r);

            notifications.notifyAdmins(
                    "DALOFT AEROSPACE | Leave Request Cancelled",
                    e.getName()
                            + " cancelled leave request "
                            + id,
                    "LEAVE"
            );

            audit.log(
                    auth,
                    "LEAVE_CANCELLED",
                    "Employee cancelled leave request " + id,
                    "LEAVE",
                    id,
                    "SUCCESS",
                    null
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
                                    safe(e)
                            )
                    );
        }
    }

    // =========================================================
    // EMPLOYEE - MY LEAVE REQUESTS
    // =========================================================

    @GetMapping("/api/leaves/me")
    public List<LeaveRequestResponse> mine(Authentication a) {

        return leaves
                .findByEmployeeEmployeeIdOrderByCreatedAtDesc(
                        a.getName()
                )
                .stream()
                .map(LeaveRequestResponse::new)
                .toList();
    }

    // =========================================================
    // EMPLOYEE - LEAVE BALANCES
    // =========================================================

    @GetMapping("/api/leaves/balances")
    public List<LeaveBalanceResponse> balances(
            Authentication a,
            @RequestParam(required = false) Integer year) {

        Employee e = employees
                .findByEmployeeId(a.getName())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Employee not found"
                        )
                );

        int targetYear = year == null
                ? settings.today().getYear()
                : year;

        if (targetYear < 2000 || targetYear > 2100) {
            throw new IllegalArgumentException(
                    "Invalid leave year"
            );
        }

        return balanceService
                .mine(e, targetYear)
                .stream()
                .map(LeaveBalanceResponse::new)
                .toList();
    }

    // =========================================================
    // ADMIN - ALL LEAVES
    // =========================================================

    @GetMapping("/api/admin/leaves")
    public List<LeaveRequestResponse> all() {

        return leaves
                .findAll()
                .stream()
                .sorted(
                        Comparator.comparing(
                                LeaveRequest::getCreatedAt,
                                Comparator.nullsLast(
                                        Comparator.reverseOrder()
                                )
                        )
                )
                .map(LeaveRequestResponse::new)
                .toList();
    }

    // =========================================================
    // ADMIN - APPROVE / REJECT LEAVE
    // =========================================================

    @PutMapping("/api/admin/leaves/{id}/status")
    @Transactional
    public ResponseEntity<?> status(
            @PathVariable Long id,
            @RequestBody Map<String, String> b,
            Authentication auth) {

        try {

            String raw = Optional
                    .ofNullable(b.get("status"))
                    .orElse("")
                    .trim()
                    .toUpperCase(Locale.ROOT);

            if (!raw.equals("APPROVED")
                    && !raw.equals("REJECTED")) {

                throw new IllegalArgumentException(
                        "Status must be APPROVED or REJECTED"
                );
            }

            LeaveRequest r = leaves
                    .findById(id)
                    .orElseThrow(() ->
                            new NoSuchElementException(
                                    "Leave request not found"
                            )
                    );

            boolean system = auth
                    .getAuthorities()
                    .stream()
                    .anyMatch(x ->
                            x.getAuthority()
                                    .equals("ROLE_SYSTEM_ADMIN")
                    );

            if (!system && r.getStatus() != LeaveStatus.PENDING) {

                throw new IllegalArgumentException(
                        "HR Admin can review only pending requests; " +
                                "Organization Admin can override a final decision"
                );
            }

            String reason = Optional
                    .ofNullable(b.get("reason"))
                    .orElse("")
                    .trim();

            if (raw.equals("REJECTED") && reason.isBlank()) {

                throw new IllegalArgumentException(
                        "A rejection reason is required"
                );
            }

            if (reason.length() > 2000) {

                throw new IllegalArgumentException(
                        "Rejection reason is too long"
                );
            }

            LeaveStatus target = LeaveStatus.valueOf(raw);

            // =================================================
            // LEAVE BALANCE
            // =================================================

            if (target == LeaveStatus.APPROVED
                    && r.getStatus() != LeaveStatus.APPROVED) {

                balanceService.reserveOnApproval(r);
            }

            if (target != LeaveStatus.APPROVED
                    && r.getStatus() == LeaveStatus.APPROVED) {

                balanceService.releaseOnReversal(r);
            }

            // =================================================
            // UPDATE REQUEST
            // =================================================

            r.setStatus(target);

            r.setRejectionReason(
                    target == LeaveStatus.REJECTED
                            ? reason
                            : null
            );

            LeaveRequest saved = leaves.saveAndFlush(r);

            // =================================================
            // PROFESSIONAL EMAIL / NOTIFICATION
            // =================================================

            String subject;
            String msg;

            if (target == LeaveStatus.APPROVED) {

                subject =
                        "DALOFT AEROSPACE | Leave Request Approved";

                msg =
                        "Dear "
                                + saved.getEmployee().getName()
                                + ",\n\n" +

                                "Your leave request has been reviewed and approved.\n\n" +

                                "LEAVE DETAILS\n" +
                                "------------------------------\n" +
                                "Leave Type: "
                                + saved.getLeaveType()
                                + "\n" +

                                "Start Date: "
                                + saved.getStartDate()
                                + "\n" +

                                "End Date: "
                                + saved.getEndDate()
                                + "\n" +

                                "Working Days: "
                                + saved.getWorkingDays()
                                + "\n" +

                                "Status: APPROVED\n\n" +

                                "Please ensure that any pending work is appropriately handed over " +
                                "before your leave begins.\n\n" +

                                "You can view the complete leave request and related information " +
                                "in DALOFT People.\n\n" +

                                "Regards,\n" +
                                "HR & People Operations\n" +
                                "DALOFT AEROSPACE PRIVATE LIMITED";

            } else {

                subject =
                        "DALOFT AEROSPACE | Leave Request Update";

                msg =
                        "Dear "
                                + saved.getEmployee().getName()
                                + ",\n\n" +

                                "Your leave request has been reviewed and could not be approved.\n\n" +

                                "LEAVE DETAILS\n" +
                                "------------------------------\n" +
                                "Leave Type: "
                                + saved.getLeaveType()
                                + "\n" +

                                "Start Date: "
                                + saved.getStartDate()
                                + "\n" +

                                "End Date: "
                                + saved.getEndDate()
                                + "\n" +

                                "Working Days: "
                                + saved.getWorkingDays()
                                + "\n" +

                                "Status: NOT APPROVED\n\n" +

                                "Manager / HR Remarks:\n" +
                                reason +
                                "\n\n" +

                                "Please review the remarks and contact HR & People Operations " +
                                "if you require clarification.\n\n" +

                                "You can view the complete leave request and related information " +
                                "in DALOFT People.\n\n" +

                                "Regards,\n" +
                                "HR & People Operations\n" +
                                "DALOFT AEROSPACE PRIVATE LIMITED";
            }

            notifications.create(
                    saved.getEmployee(),
                    subject,
                    msg,
                    "LEAVE",
                    true
            );

            // =================================================
            // AUDIT
            // =================================================

            audit.log(
                    auth,
                    system
                            ? "LEAVE_ADMIN_OVERRIDE"
                            : "LEAVE_HR_DECISION",

                    (system
                            ? "Organization Admin"
                            : "HR Admin")
                            + " set leave request "
                            + id
                            + " to "
                            + raw,

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
                                    safe(e)
                            )
                    );
        }
    }

    // =========================================================
    // SAFE ERROR MESSAGE
    // =========================================================

    private String safe(Exception e) {

        return e.getMessage() == null
                ? "Unable to complete the leave operation"
                : e.getMessage();
    }
}