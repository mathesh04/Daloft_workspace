package com.ems.controller;

import com.ems.model.*;
import com.ems.dto.EmployeeResponse;
import com.ems.dto.LeaveRequestResponse;
import com.ems.dto.DepartmentResponse;
import com.ems.repository.*;
import com.ems.service.*;
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

    public ManagerController(
            EmployeeRepository e,
            AttendanceRepository at,
            DepartmentRepository d,
            LeaveRequestRepository l,
            NotificationService n,
            AuditService a,
            SystemSettingsService s,
            LeaveBalanceService bs,
            AttendanceRegularizationService ar) {

        employees = e;
        attendance = at;
        departments = d;
        leaves = l;
        notifications = n;
        audit = a;
        settings = s;
        balanceService = bs;
        regularization = ar;
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

    private boolean manages(Employee m, Employee e) {

        if (e == null) {
            return false;
        }

        if (e.getReportingManager() != null
                && e.getReportingManager().getId().equals(m.getId())) {
            return true;
        }

        return departments
                .findByManagerId(m.getId())
                .stream()
                .anyMatch(d ->
                        d.isActive()
                                && d.getName().equalsIgnoreCase(e.getDepartment())
                );
    }

    @GetMapping("/team")
    public List<EmployeeResponse> team(Authentication a) {

        Employee m = me(a);

        return employees.findAll()
                .stream()
                .filter(e ->
                        e.isActive()
                                && e.getRole() == Role.EMPLOYEE
                                && !e.getId().equals(m.getId())
                                && manages(m, e)
                )
                .sorted(Comparator.comparing(Employee::getName))
                .map(EmployeeResponse::new)
                .toList();
    }

    @GetMapping("/departments")
    public List<DepartmentResponse> departments(Authentication a) {

        Employee m = me(a);

        return departments
                .findByManagerId(m.getId())
                .stream()
                .filter(Department::isActive)
                .sorted(Comparator.comparing(Department::getName))
                .map(DepartmentResponse::new)
                .toList();
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

            /*
             * APPROVAL
             * --------
             * Reserve the leave balance before changing the status.
             */
            if (st.equals("APPROVED")) {

                balanceService.reserveOnApproval(r);

            } else {

                /*
                 * REJECTION
                 * ----------
                 * Store the manager's rejection reason.
                 */
                r.setRejectionReason(reason);
            }

            r.setStatus(
                    LeaveStatus.valueOf(st)
            );

            LeaveRequest saved =
                    leaves.save(r);

            /*
             * =========================================================
             * EMAIL / NOTIFICATION
             * =========================================================
             */

            String msg;

            /*
             * =========================================================
             * LEAVE APPROVED
             * =========================================================
             */
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

            /*
             * =========================================================
             * LEAVE REJECTED
             * =========================================================
             */
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

            /*
             * =========================================================
             * AUDIT LOG
             * =========================================================
             */

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
}