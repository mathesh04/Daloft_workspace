package com.ems.service;

import com.ems.dto.TaskResponse;
import com.ems.dto.TaskTargetResponse;
import com.ems.model.Department;
import com.ems.model.Employee;
import com.ems.model.Role;
import com.ems.model.Task;
import com.ems.repository.DepartmentRepository;
import com.ems.repository.EmployeeRepository;
import com.ems.repository.TaskRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class TaskService {

    private final TaskRepository tasks;
    private final EmployeeRepository employees;
    private final DepartmentRepository departments;
    private final AuditService audit;
    private final SystemSettingsService settings;

    public TaskService(
            TaskRepository tasks,
            EmployeeRepository employees,
            DepartmentRepository departments,
            AuditService audit,
            SystemSettingsService settings) {
        this.tasks = tasks;
        this.employees = employees;
        this.departments = departments;
        this.audit = audit;
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public List<Task> getAll() {
        return tasks.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<Task> getForManager(String employeeId) {
        Employee manager = actor(employeeId);
        if (manager.getRole() != Role.MANAGER) {
            throw new SecurityException("Manager access required");
        }
        return tasks.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(task -> canManage(manager, task.getAssignedTo()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Task> getForEmployee(String employeeId) {
        Employee employee = actor(employeeId);
        return tasks.findByAssignedToOrderByDueDateAsc(employee);
    }

    /**
     * Returns exactly the people/departments a manager is allowed to target.
     * Direct reports and employees in managed active departments are both included.
     */
    @Transactional(readOnly = true)
    public TaskTargetResponse getTaskTargetsForManager(String managerEmployeeId) {
        Employee manager = actor(managerEmployeeId);
        if (manager.getRole() != Role.MANAGER) {
            throw new SecurityException("Manager access required");
        }

        List<Department> managedDepartments = departments.findByManagerId(manager.getId())
                .stream()
                .filter(Department::isActive)
                .toList();

        List<TaskResponse.EmployeeSummary> people = employees.findAll()
                .stream()
                .filter(Employee::isActive)
                .filter(e -> e.getRole() == Role.EMPLOYEE)
                .filter(e -> {
                    if (e.getReportingManager() != null
                            && Objects.equals(e.getReportingManager().getId(), manager.getId())) {
                        return true;
                    }
                    return managedDepartments.stream().anyMatch(d -> departmentMatches(e, d));
                })
                .sorted(Comparator.comparing(
                        Employee::getName,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(TaskResponse.EmployeeSummary::from)
                .toList();

        List<TaskTargetResponse.DepartmentSummary> departmentsForManager = managedDepartments
                .stream()
                .sorted(Comparator.comparing(
                        Department::getName,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(d -> new TaskTargetResponse.DepartmentSummary(
                        d.getId(), d.getName(), d.getCode(), d.isActive()))
                .toList();

        return new TaskTargetResponse(people, departmentsForManager);
    }

    /**
     * Returns safe Organization Admin / HR Admin task targets.
     * SYSTEM_ADMIN users are never exposed as ordinary task recipients.
     */
    @Transactional(readOnly = true)
    public TaskTargetResponse getTaskTargetsForAdmin(String employeeId) {
        Employee requester = actor(employeeId);
        if (requester.getRole() != Role.SYSTEM_ADMIN && requester.getRole() != Role.HR_ADMIN) {
            throw new SecurityException("Task administration access required");
        }

        List<TaskResponse.EmployeeSummary> people = employees.findAll()
                .stream()
                .filter(Employee::isActive)
                .filter(e -> e.getRole() != Role.SYSTEM_ADMIN)
                .sorted(Comparator.comparing(
                        Employee::getName,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(TaskResponse.EmployeeSummary::from)
                .toList();

        List<TaskTargetResponse.DepartmentSummary> departmentsAll = departments.findAll()
                .stream()
                .filter(Department::isActive)
                .sorted(Comparator.comparing(
                        Department::getName,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(d -> new TaskTargetResponse.DepartmentSummary(
                        d.getId(), d.getName(), d.getCode(), d.isActive()))
                .toList();

        return new TaskTargetResponse(people, departmentsAll);
    }

    private Employee actor(String employeeId) {
        if (employeeId == null || employeeId.isBlank()) {
            throw new IllegalArgumentException("Employee ID is required");
        }
        return employees.findByEmployeeId(employeeId.trim())
                .orElseThrow(() -> new IllegalArgumentException("Actor not found"));
    }

    private boolean canManage(Employee manager, Employee target) {
        if (manager == null || target == null) {
            return false;
        }

        if (manager.getRole() == Role.SYSTEM_ADMIN || manager.getRole() == Role.HR_ADMIN) {
            return true;
        }

        if (manager.getRole() != Role.MANAGER || target.getRole() != Role.EMPLOYEE) {
            return false;
        }

        if (target.getReportingManager() != null
                && Objects.equals(target.getReportingManager().getId(), manager.getId())) {
            return true;
        }

        return departments.findByManagerId(manager.getId())
                .stream()
                .filter(Department::isActive)
                .anyMatch(d -> departmentMatches(target, d));
    }

    private boolean departmentMatches(Employee employee, Department department) {
        if (employee == null || department == null || employee.getDepartment() == null) {
            return false;
        }
        return departmentNameOrCodeMatches(department, employee.getDepartment());
    }

    private boolean departmentNameOrCodeMatches(Department department, String value) {
        if (department == null || value == null || value.isBlank()) {
            return false;
        }
        String normalized = value.trim();
        return (department.getName() != null
                    && department.getName().equalsIgnoreCase(normalized))
                || (department.getCode() != null
                    && department.getCode().equalsIgnoreCase(normalized));
    }

    @Transactional
    public List<Task> create(
            String title,
            String description,
            String assignedTo,
            String department,
            String targetRole,
            String assignmentMode,
            LocalDate dueDate,
            String assignedById) {

        Employee assignedBy = actor(assignedById);
        validateTitle(title);

        if (dueDate != null && dueDate.isBefore(settings.today())) {
            throw new IllegalArgumentException("Due date cannot be in the past");
        }

        String mode = assignmentMode == null
                ? "employee"
                : assignmentMode.trim().toLowerCase(Locale.ROOT);

        List<Employee> targets = new ArrayList<>();
        String assignmentType = "EMPLOYEE";
        String targetDepartment = null;
        String normalizedRole = null;

        if ("employee".equals(mode)) {
            String employeeId = requireText(assignedTo, "Employee is required");
            Employee target = employees.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new IllegalArgumentException("Assignee not found"));

            if (!target.isActive()) {
                throw new IllegalArgumentException("Assignee is inactive");
            }

            if (assignedBy.getRole() == Role.MANAGER && target.getRole() != Role.EMPLOYEE) {
                throw new SecurityException("Managers can assign tasks only to employees");
            }

            if (!canManage(assignedBy, target)) {
                throw new SecurityException("You can only assign tasks to employees under your responsibility");
            }

            targets.add(target);
        }
        else if ("department".equals(mode)) {
            targetDepartment = requireText(department, "Department is required");
            final String requestedDepartment = targetDepartment;

            if (assignedBy.getRole() == Role.MANAGER) {
                boolean managesDepartment = departments.findByManagerId(assignedBy.getId())
                        .stream()
                        .filter(Department::isActive)
                        .anyMatch(d -> departmentNameOrCodeMatches(d, requestedDepartment));
                if (!managesDepartment) {
                    throw new SecurityException("You do not manage this department");
                }
            }

            targets.addAll(employees.findByDepartmentIgnoreCaseAndActiveTrue(requestedDepartment)
                    .stream()
                    .filter(e -> e.getRole() == Role.EMPLOYEE)
                    .filter(e -> !Objects.equals(e.getId(), assignedBy.getId()))
                    .toList());

            // If the employee table stores the department code instead of the display name,
            // resolve by code as a second path.
            if (targets.isEmpty()) {
                Department matchingDepartment = departments.findAll()
                        .stream()
                        .filter(Department::isActive)
                        .filter(d -> departmentNameOrCodeMatches(d, requestedDepartment))
                        .findFirst()
                        .orElse(null);
                if (matchingDepartment != null && matchingDepartment.getCode() != null) {
                    targets.addAll(employees.findByDepartmentIgnoreCaseAndActiveTrue(matchingDepartment.getCode())
                            .stream()
                            .filter(e -> e.getRole() == Role.EMPLOYEE)
                            .filter(e -> !Objects.equals(e.getId(), assignedBy.getId()))
                            .toList());
                }
            }

            if (targets.isEmpty()) {
                throw new IllegalArgumentException("No active employees found in department");
            }
            assignmentType = "DEPARTMENT";
        }
        else if ("role".equals(mode) || "all".equals(mode)) {
            if (assignedBy.getRole() == Role.MANAGER) {
                throw new SecurityException("Managers can assign tasks only to their employees or managed departments");
            }

            if ("all".equals(mode)) {
                assignmentType = "ROLE_GROUP";
                normalizedRole = "ALL_NON_SYSTEM_USERS";
                targets.addAll(employees.findByRoleIn(List.of(
                                Role.HR_ADMIN, Role.MANAGER, Role.EMPLOYEE))
                        .stream()
                        .filter(Employee::isActive)
                        .filter(e -> !Objects.equals(e.getId(), assignedBy.getId()))
                        .toList());
            } else {
                normalizedRole = requireText(targetRole, "Target role is required");
                Role role;
                try {
                    role = Role.valueOf(normalizedRole.toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException ex) {
                    throw new IllegalArgumentException("Unsupported target role");
                }

                if (role == Role.SYSTEM_ADMIN) {
                    throw new SecurityException("Organization Admin tasks cannot be broadcast to system administrators");
                }

                assignmentType = "ROLE";
                normalizedRole = role.name();
                targets.addAll(employees.findByRole(role)
                        .stream()
                        .filter(Employee::isActive)
                        .filter(e -> !Objects.equals(e.getId(), assignedBy.getId()))
                        .toList());
            }

            if (targets.isEmpty()) {
                throw new IllegalArgumentException("No eligible recipients found for this task");
            }
        }
        else {
            throw new IllegalArgumentException("Unsupported assignment mode");
        }

        List<Task> result = new ArrayList<>();
        for (Employee target : targets) {
            Task task = new Task();
            task.setTitle(title.trim());
            task.setDescription(description == null ? null : description.trim());
            task.setAssignedTo(target);
            task.setAssignedBy(assignedBy);
            task.setDueDate(dueDate);
            task.setAssignmentType(assignmentType);
            task.setTargetDepartment(targetDepartment);
            task.setTargetRole(normalizedRole);

            Task saved = tasks.save(task);
            result.add(saved);

            audit.log(
                    SecurityContextHolder.getContext().getAuthentication(),
                    "TASK_ASSIGNED",
                    "Assigned task '" + title.trim() + "' to " + target.getEmployeeId(),
                    "TASK",
                    saved.getId(),
                    "SUCCESS",
                    null
            );
        }

        return result;
    }

    // Backward-compatible overload.
    public List<Task> create(
            String title,
            String description,
            String assignedTo,
            String department,
            LocalDate dueDate,
            String assignedById) {
        String mode = department != null && !department.isBlank() ? "department" : "employee";
        return create(title, description, assignedTo, department, null, mode, dueDate, assignedById);
    }

    @Transactional
    public Task updateStatus(
            Long id,
            Task.TaskStatus status,
            String requester,
            boolean admin) {

        if (status == null) {
            throw new IllegalArgumentException("Task status is required");
        }

        Task task = tasks.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        Employee employee = actor(requester);

        boolean assignee = task.getAssignedTo() != null
                && requester.equals(task.getAssignedTo().getEmployeeId());
        boolean manager = canManage(employee, task.getAssignedTo());
        boolean allowed = admin
                || employee.getRole() == Role.SYSTEM_ADMIN
                || assignee
                || manager;

        if (!allowed) {
            throw new SecurityException("You can only update tasks you own or manage");
        }

        task.setStatus(status);
        Task saved = tasks.save(task);

        audit.log(
                SecurityContextHolder.getContext().getAuthentication(),
                "TASK_STATUS_CHANGED",
                "Task status changed to " + status,
                "TASK",
                id,
                "SUCCESS",
                null
        );

        return saved;
    }

    @Transactional
    public void delete(Long id, String requester) {
        Task task = tasks.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
        Employee employee = actor(requester);

        boolean systemAdmin = employee.getRole() == Role.SYSTEM_ADMIN;
        boolean creator = task.getAssignedBy() != null
                && Objects.equals(task.getAssignedBy().getId(), employee.getId());
        boolean manager = canManage(employee, task.getAssignedTo());

        if (!systemAdmin && !creator && !manager) {
            throw new SecurityException("Not allowed to delete this task");
        }

        tasks.delete(task);

        audit.log(
                SecurityContextHolder.getContext().getAuthentication(),
                "TASK_DELETED",
                "Deleted task " + id,
                "TASK",
                id,
                "SUCCESS",
                null
        );
    }

    private void validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (title.trim().length() > 200) {
            throw new IllegalArgumentException("Title cannot exceed 200 characters");
        }
    }

    private String requireText(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName);
        }
        return value.trim();
    }
}
