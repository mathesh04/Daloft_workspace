package com.ems.controller;

import com.ems.model.Employee;
import com.ems.model.Role;
import com.ems.repository.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController 
@RequestMapping("/api/system-admin/summary")
public class SystemAdminSummaryController {
    private final EmployeeRepository employees; 
    private final OfficeLocationRepository offices; 
    private final AuditLogRepository audits; 
    private final DepartmentRepository departments;

    public SystemAdminSummaryController(EmployeeRepository e, OfficeLocationRepository o, AuditLogRepository a, DepartmentRepository d){
        employees=e;
        offices=o;
        audits=a;
        departments=d;
    }

    @GetMapping 
    public Map<String,Object> summary(){
        Map<String,Object> m=new LinkedHashMap<>(); 
        m.put("systemAdmins", employees.findByRole(Role.SYSTEM_ADMIN).size());
        int adminCount = employees.findByRoleIn(List.of(Role.ADMIN, Role.HR_ADMIN)).size();
        m.put("admins", adminCount);
        m.put("hrAdmins", adminCount);
        m.put("managers", employees.findByRole(Role.MANAGER).size());
        m.put("departments", departments.count());

        List<Employee> workforce = employees.findAll().stream()
                .filter(e -> e.getRole() != Role.SYSTEM_ADMIN && e.getRole() != Role.ADMIN)
                .toList();
        long activeCount = workforce.stream().filter(Employee::isActive).count();
        long inactiveCount = workforce.size() - activeCount;

        m.put("employees", workforce.size());
        m.put("activeEmployees", activeCount);
        m.put("inactiveEmployees", inactiveCount);
        m.put("offices", offices.count());
        m.put("recentAuditEvents", audits.count());
        return m;
    }
}