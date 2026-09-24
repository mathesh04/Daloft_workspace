package com.ems.service;

import com.ems.util.TimeUtil;

import java.time.LocalDateTime;
import java.util.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.model.*;
import com.ems.repository.*;

@Service
public class EmployeeInventoryService {

    private final ComponentRepository components;
    private final EmployeeRepository employees;
    private final InventoryRequestRepository requests;
    private final InventoryUsageUpdateRepository updates;
    private final StockTransactionRepository transactions;
    private final AuditLogRepository audit;
    private final NotificationService notifications;

    public EmployeeInventoryService(
            ComponentRepository c,
            EmployeeRepository e,
            InventoryRequestRepository r,
            InventoryUsageUpdateRepository u,
            StockTransactionRepository t,
            AuditLogRepository a,
            NotificationService n) {

        components = c;
        employees = e;
        requests = r;
        updates = u;
        transactions = t;
        audit = a;
        notifications = n;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> available() {
        return components.findAllByOrderByNameAsc()
                .stream()
                .map(this::componentDto)
                .toList();
    }

    @Transactional
    public Map<String, Object> request(String user, Map<String, Object> b) {

        Component c = component(num(b.get("componentId")));
        int q = qty(b.get("quantity"));

        if (c.getCurrentQuantity() < q) {
            throw new IllegalArgumentException(
                    "Only " + c.getCurrentQuantity() + " available");
        }

        InventoryRequest r = new InventoryRequest();

        Employee emp = employee(user);

        r.setComponent(c);
        r.setEmployee(emp);
        r.setQuantity(q);
        r.setPurpose(text(b.get("purpose")));

        requests.save(r);

        notifications.notifyAdmins(
                "Inventory request pending",
                emp.getName() + " requested " + q + " "
                        + c.getUnit() + " of " + c.getName() + ".",
                "INVENTORY"
        );

        log(
                user,
                "REQUEST_ITEM",
                "Requested " + q + " " + c.getUnit()
                        + " of " + c.getName()
        );

        return requestDto(r);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> myRequests(String user) {
        return requests
                .findByEmployeeEmployeeIdOrderByRequestedAtDesc(user)
                .stream()
                .map(this::requestDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> allRequests() {
        return requests
                .findAllByOrderByRequestedAtDesc()
                .stream()
                .map(this::requestDto)
                .toList();
    }

    @Transactional
    public Map<String, Object> review(
            Long id,
            Map<String, Object> b,
            String admin) {

        InventoryRequest r = requests
                .findByIdForUpdate(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Request not found"));

        if (r.getStatus() != RequestStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Request already reviewed");
        }

        boolean approve = Boolean.TRUE.equals(b.get("approved"));

        r.setAdminRemark(text(b.get("remark")));
        r.setReviewedAt(TimeUtil.now());
        r.setReviewedBy(admin);

        if (!approve) {

            r.setStatus(RequestStatus.REJECTED);

            InventoryRequest saved = requests.save(r);

            notifications.create(
                    r.getEmployee(),
                    "Inventory request rejected",
                    "Your inventory request #" + id
                            + " was rejected.",
                    "INVENTORY",
                    false
            );

            log(
                    admin,
                    "REJECT_REQUEST",
                    "Rejected request #" + id
            );

            return requestDto(saved);
        }

        Component c = components
                .findWithLockById(r.getComponent().getId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Component not found"));

        if (c.getCurrentQuantity() < r.getQuantity()) {
            throw new IllegalArgumentException(
                    "Insufficient stock. Available: "
                            + c.getCurrentQuantity());
        }

        c.setCurrentQuantity(
                c.getCurrentQuantity() - r.getQuantity()
        );

        components.save(c);

        r.setStatus(RequestStatus.APPROVED);

        requests.save(r);

        notifications.create(
                r.getEmployee(),
                "Inventory request approved",
                "Your request for "
                        + r.getQuantity()
                        + " "
                        + c.getUnit()
                        + " of "
                        + c.getName()
                        + " has been approved.",
                "INVENTORY",
                false
        );

        StockTransaction t = new StockTransaction();

        t.setComponent(c);
        t.setTransactionType(TransactionType.OUT);
        t.setQuantity(r.getQuantity());
        t.setPurpose(
                "Employee request: "
                        + (r.getPurpose() == null
                        ? ""
                        : r.getPurpose())
        );
        t.setCreatedBy(admin);

        transactions.save(t);

        log(
                admin,
                "APPROVE_REQUEST",
                "Approved request #"
                        + id
                        + " for "
                        + c.getName()
        );

        return requestDto(r);
    }

    /**
     * Employee's currently assigned inventory.
     *
     * IMPORTANT:
     * RETURN_REQUESTED is NOT deducted here.
     *
     * Therefore:
     *
     * Issued 9
     * Return requested 5
     * Admin has NOT approved yet
     *
     * My Assets still shows 9.
     *
     * After admin approval:
     *
     * Returned 5
     * Remaining = 4
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> myInventory(String user) {

        return requests
                .findByEmployeeEmployeeIdOrderByRequestedAtDesc(user)
                .stream()
                .filter(r -> r.getStatus() == RequestStatus.APPROVED)
                .map(r -> {

                    Map<String, Object> dto = requestDto(r);

                    int issued = safeQty(r.getQuantity());

                    int returned = closedQuantity(
                            r,
                            UsageStatus.RETURNED
                    );

                    int consumed = closedQuantity(
                            r,
                            UsageStatus.CONSUMED
                    );

                    int damaged = closedQuantity(
                            r,
                            UsageStatus.DAMAGED
                    );

                    int pendingReturn = pendingReturnQuantity(r);

                    int remaining = Math.max(
                            0,
                            issued
                                    - returned
                                    - consumed
                                    - damaged
                    );

                    /*
                     * Quantity the employee can submit for another
                     * return request.
                     *
                     * Example:
                     *
                     * Issued = 9
                     * Pending return = 5
                     *
                     * Available for another return = 4
                     */
                    int returnableNow = Math.max(
                            0,
                            remaining - pendingReturn
                    );

                    dto.put(
                            "issuedQuantity",
                            issued
                    );

                    dto.put(
                            "returnedQuantity",
                            returned
                    );

                    dto.put(
                            "consumedQuantity",
                            consumed
                    );

                    dto.put(
                            "damagedQuantity",
                            damaged
                    );

                    dto.put(
                            "remainingQuantity",
                            remaining
                    );

                    dto.put(
                            "pendingReturnQuantity",
                            pendingReturn
                    );

                    dto.put(
                            "returnableQuantity",
                            returnableNow
                    );

                    dto.put(
                            "assignmentStatus",
                            remaining == 0
                                    ? "CLOSED"
                                    : "ASSIGNED"
                    );

                    return dto;
                })
                /*
                 * Only completely closed assignments disappear.
                 *
                 * A pending return does NOT make the asset disappear.
                 */
                .filter(dto ->
                        ((Number) dto.get("remainingQuantity"))
                                .intValue() > 0
                )
                .toList();
    }

    @Transactional
    public Map<String, Object> usage(
            String user,
            Map<String, Object> b) {

        InventoryRequest r = requests
                .findById(num(b.get("requestId")))
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Request not found"));

        if (!r.getEmployee()
                .getEmployeeId()
                .equals(user)
                || r.getStatus() != RequestStatus.APPROVED) {

            throw new IllegalArgumentException(
                    "Invalid inventory request");
        }

        UsageStatus status;

        try {

            status = UsageStatus
                    .valueOf(
                            String.valueOf(
                                    b.get("usageStatus")
                            ).toUpperCase()
                    );

        } catch (Exception e) {

            throw new IllegalArgumentException(
                    "Invalid usage status");
        }

        /*
         * These statuses are controlled by admin review.
         */
        if (status == UsageStatus.RETURNED
                || status == UsageStatus.RETURN_REJECTED) {

            throw new IllegalArgumentException(
                    "This usage status is managed by the inventory review workflow.");
        }

        /*
         * The employee must specify a positive quantity.
         */
        int reportedQty = qty(
                b.getOrDefault(
                        "quantity",
                        r.getQuantity()
                )
        );

        /*
         * Remaining assignment after completed actions.
         *
         * RETURN_REQUESTED is intentionally NOT deducted here
         * because the item remains assigned until admin approval.
         */
        int remaining = remainingQuantity(r);

        /*
         * Pending return quantity.
         */
        int pendingReturn = pendingReturnQuantity(r);

        /*
         * Quantity actually available for another action.
         */
        int actionableQuantity = Math.max(
                0,
                remaining - pendingReturn
        );

        if (reportedQty > actionableQuantity) {

            throw new IllegalArgumentException(
                    "Only "
                            + actionableQuantity
                            + " unit(s) are available for this update."
            );
        }

        /*
         * Only one return request can be pending for an assignment.
         */
        if (status == UsageStatus.RETURN_REQUESTED
                && updates.existsByRequestIdAndUsageStatus(
                r.getId(),
                UsageStatus.RETURN_REQUESTED)) {

            throw new IllegalArgumentException(
                    "A return request is already waiting for admin review."
            );
        }

        InventoryUsageUpdate u =
                new InventoryUsageUpdate();

        u.setRequest(r);
        u.setComponent(r.getComponent());
        u.setEmployee(r.getEmployee());
        u.setQuantity(reportedQty);
        u.setUsageStatus(status);

        u.setProjectName(
                text(b.get("projectName"))
        );

        u.setNotes(
                text(b.get("notes"))
        );

        updates.save(u);

        log(
                user,
                "USAGE_UPDATE",
                "Updated "
                        + r.getComponent().getName()
                        + " as "
                        + u.getUsageStatus()
                        + " quantity "
                        + reportedQty
        );

        return usageDto(u);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> myUsage(String user) {

        return updates
                .findByEmployeeEmployeeIdOrderByCreatedAtDesc(user)
                .stream()
                .map(this::usageDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> allUsage() {

        return updates
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::usageDto)
                .toList();
    }

    /**
     * Admin approves/rejects an employee return.
     */
    @Transactional
    public Map<String, Object> reviewUsage(
            Long id,
            Map<String, Object> b,
            String admin) {

        InventoryUsageUpdate u = updates
                .findByIdForUpdate(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Usage update not found"));

        /*
         * Only RETURN_REQUESTED can be reviewed.
         */
        if (u.getUsageStatus()
                != UsageStatus.RETURN_REQUESTED) {

            throw new IllegalArgumentException(
                    "Only return requests need approval");
        }

        boolean approve =
                Boolean.TRUE.equals(
                        b.get("approved")
                );

        if (approve) {

            /*
             * Lock component stock row.
             */
            Component c = components
                    .findWithLockById(
                            u.getComponent().getId()
                    )
                    .orElseThrow(() ->
                            new IllegalArgumentException(
                                    "Component not found"));

            /*
             * Recalculate assignment quantity at approval time.
             *
             * The return being approved is excluded.
             */
            int remainingAtReview =
                    remainingQuantityExcluding(
                            u.getRequest(),
                            u.getId()
                    );

            if (u.getQuantity() > remainingAtReview) {

                throw new IllegalArgumentException(
                        "This return quantity is no longer available on the assignment."
                );
            }

            /*
             * Put approved returned quantity back into stock.
             */
            c.setCurrentQuantity(
                    c.getCurrentQuantity()
                            + u.getQuantity()
            );

            components.save(c);

            /*
             * Record inventory IN transaction.
             */
            StockTransaction t =
                    new StockTransaction();

            t.setComponent(c);
            t.setTransactionType(
                    TransactionType.IN
            );
            t.setQuantity(
                    u.getQuantity()
            );

            t.setPurpose(
                    "Approved asset return"
            );

            t.setCreatedBy(admin);

            transactions.save(t);

            /*
             * IMPORTANT:
             * Only now is the quantity considered returned.
             */
            u.setUsageStatus(
                    UsageStatus.RETURNED
            );

            notifications.create(
                    u.getEmployee(),
                    "Inventory return approved",
                    "Your return of "
                            + u.getQuantity()
                            + " "
                            + c.getUnit()
                            + " of "
                            + c.getName()
                            + " was approved.",
                    "INVENTORY",
                    false
            );

            log(
                    admin,
                    "APPROVE_RETURN",
                    "Returned "
                            + u.getQuantity()
                            + " "
                            + c.getUnit()
                            + " of "
                            + c.getName()
            );

        } else {

            /*
             * Rejected return does NOT affect stock
             * and does NOT reduce employee assignment.
             */
            u.setUsageStatus(
                    UsageStatus.RETURN_REJECTED
            );

            notifications.create(
                    u.getEmployee(),
                    "Inventory return not approved",
                    "Your return request for "
                            + u.getComponent().getName()
                            + " was not approved. "
                            + "The item remains assigned to you.",
                    "INVENTORY",
                    false
            );

            log(
                    admin,
                    "REJECT_RETURN",
                    "Return rejected; assignment remains open for "
                            + u.getComponent().getName()
            );
        }

        return usageDto(
                updates.save(u)
        );
    }

    /**
     * Remaining quantity that is actually assigned.
     *
     * RETURN_REQUESTED is intentionally ignored.
     *
     * Example:
     *
     * Issued 9
     * RETURN_REQUESTED 5
     *
     * Remaining = 9
     *
     * After RETURNED 5:
     *
     * Remaining = 4
     */
    private int remainingQuantity(
            InventoryRequest r) {

        return remainingQuantityExcluding(
                r,
                null
        );
    }

    private int remainingQuantityExcluding(
            InventoryRequest r,
            Long excludedId) {

        int issued =
                safeQty(r.getQuantity());

        int closed =
                updates.findByRequestId(r.getId())
                        .stream()
                        .filter(u ->
                                excludedId == null
                                        || !Objects.equals(
                                        u.getId(),
                                        excludedId
                                )
                        )
                        .filter(u ->
                                u.getUsageStatus()
                                        == UsageStatus.RETURNED
                                        || u.getUsageStatus()
                                        == UsageStatus.CONSUMED
                                        || u.getUsageStatus()
                                        == UsageStatus.DAMAGED
                        )
                        .mapToInt(
                                u -> safeQty(
                                        u.getQuantity()
                                )
                        )
                        .sum();

        return Math.max(
                0,
                issued - closed
        );
    }

    /**
     * Quantity currently waiting for admin approval.
     */
    private int pendingReturnQuantity(
            InventoryRequest r) {

        return updates
                .findByRequestId(r.getId())
                .stream()
                .filter(u ->
                        u.getUsageStatus()
                                == UsageStatus.RETURN_REQUESTED
                )
                .mapToInt(
                        u -> safeQty(
                                u.getQuantity()
                        )
                )
                .sum();
    }

    private int closedQuantity(
            InventoryRequest r,
            UsageStatus status) {

        return updates
                .findByRequestId(r.getId())
                .stream()
                .filter(u ->
                        u.getUsageStatus() == status
                )
                .mapToInt(
                        u -> safeQty(
                                u.getQuantity()
                        )
                )
                .sum();
    }

    private int safeQty(Integer q) {
        return q == null
                ? 0
                : Math.max(0, q);
    }

    private void log(
            String actor,
            String action,
            String details) {

        AuditLog l = new AuditLog();

        l.setActor(actor);
        l.setAction(action);
        l.setDetails(details);

        audit.save(l);
    }

    private Employee employee(String id) {

        return employees
                .findByEmployeeId(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Employee not found"));
    }

    private Component component(Long id) {

        return components
                .findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Component not found"));
    }

    private Long num(Object v) {

        try {

            return Long.valueOf(
                    String.valueOf(v)
            );

        } catch (Exception e) {

            throw new IllegalArgumentException(
                    "Invalid component/request id");
        }
    }

    private int qty(Object v) {

        try {

            int q = Integer.parseInt(
                    String.valueOf(v)
            );

            if (q <= 0) {
                throw new Exception();
            }

            return q;

        } catch (Exception e) {

            throw new IllegalArgumentException(
                    "Quantity must be greater than zero");
        }
    }

    private String text(Object v) {

        return v == null
                ? null
                : String.valueOf(v).trim();
    }

    private Map<String, Object> componentDto(
            Component c) {

        Map<String, Object> m =
                new LinkedHashMap<>();

        if (c == null) {
            return m;
        }

        m.put(
                "id",
                c.getId()
        );

        m.put(
                "name",
                c.getName() == null
                        ? ""
                        : c.getName()
        );

        m.put(
                "componentCode",
                c.getComponentCode() == null
                        ? ""
                        : c.getComponentCode()
        );

        m.put(
                "category",
                c.getCategory() == null
                        ? ""
                        : c.getCategory().getName()
        );

        m.put(
                "availableQuantity",
                safeQty(
                        c.getCurrentQuantity()
                )
        );

        m.put(
                "minimumQuantity",
                safeQty(
                        c.getMinimumQuantity()
                )
        );

        m.put(
                "storageLocation",
                c.getStorageLocation() == null
                        ? ""
                        : c.getStorageLocation()
        );

        return m;
    }

    private Map<String, Object> requestDto(
            InventoryRequest r) {

        Map<String, Object> m =
                new LinkedHashMap<>();

        if (r == null) {
            return m;
        }

        m.put(
                "id",
                r.getId()
        );

        m.put(
                "component",
                r.getComponent() != null
                        ? componentDto(r.getComponent())
                        : new LinkedHashMap<>()
        );

        Map<String, Object> emp =
                new LinkedHashMap<>();

        if (r.getEmployee() != null) {

            emp.put(
                    "id",
                    r.getEmployee().getId()
            );

            emp.put(
                    "employeeId",
                    r.getEmployee().getEmployeeId() == null
                            ? ""
                            : r.getEmployee().getEmployeeId()
            );

            emp.put(
                    "name",
                    r.getEmployee().getName() == null
                            ? ""
                            : r.getEmployee().getName()
            );

            emp.put(
                    "department",
                    r.getEmployee().getDepartment() == null
                            ? ""
                            : r.getEmployee().getDepartment()
            );
        }

        m.put(
                "employee",
                emp
        );

        m.put(
                "quantity",
                safeQty(
                        r.getQuantity()
                )
        );

        m.put(
                "purpose",
                r.getPurpose() == null
                        ? ""
                        : r.getPurpose()
        );

        m.put(
                "status",
                r.getStatus() == null
                        ? ""
                        : r.getStatus().name()
        );

        m.put(
                "requestedAt",
                r.getRequestedAt()
        );

        m.put(
                "reviewedAt",
                r.getReviewedAt()
        );

        m.put(
                "reviewedBy",
                r.getReviewedBy() == null
                        ? ""
                        : r.getReviewedBy()
        );

        m.put(
                "adminRemark",
                r.getAdminRemark() == null
                        ? ""
                        : r.getAdminRemark()
        );

        return m;
    }

    private Map<String, Object> usageDto(
            InventoryUsageUpdate u) {

        Map<String, Object> m =
                new LinkedHashMap<>();

        if (u == null) {
            return m;
        }

        m.put(
                "id",
                u.getId()
        );

        m.put(
                "requestId",
                u.getRequest() != null
                        ? u.getRequest().getId()
                        : null
        );

        m.put(
                "component",
                u.getComponent() != null
                        ? componentDto(u.getComponent())
                        : new LinkedHashMap<>()
        );

        Map<String, Object> emp =
                new LinkedHashMap<>();

        if (u.getEmployee() != null) {

            emp.put(
                    "employeeId",
                    u.getEmployee().getEmployeeId() == null
                            ? ""
                            : u.getEmployee().getEmployeeId()
            );

            emp.put(
                    "name",
                    u.getEmployee().getName() == null
                            ? ""
                            : u.getEmployee().getName()
            );
        }

        m.put(
                "employee",
                emp
        );

        m.put(
                "quantity",
                safeQty(
                        u.getQuantity()
                )
        );

        m.put(
                "usageStatus",
                u.getUsageStatus() == null
                        ? ""
                        : u.getUsageStatus().name()
        );

        m.put(
                "projectName",
                u.getProjectName() == null
                        ? ""
                        : u.getProjectName()
        );

        m.put(
                "notes",
                u.getNotes() == null
                        ? ""
                        : u.getNotes()
        );

        m.put(
                "createdAt",
                u.getCreatedAt()
        );

        return m;
    }
}
