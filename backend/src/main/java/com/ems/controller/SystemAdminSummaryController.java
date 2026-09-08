package com.ems.controller;
import com.ems.model.Role; import com.ems.repository.*; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/system-admin/summary")
public class SystemAdminSummaryController {
 private final EmployeeRepository employees; private final OfficeLocationRepository offices; private final AuditLogRepository audits; private final DepartmentRepository departments;
 public SystemAdminSummaryController(EmployeeRepository e, OfficeLocationRepository o, AuditLogRepository a, DepartmentRepository d){employees=e;offices=o;audits=a;departments=d;}
 @GetMapping public Map<String,Object> summary(){Map<String,Object> m=new LinkedHashMap<>(); m.put("systemAdmins",employees.findByRole(Role.SYSTEM_ADMIN).size());m.put("hrAdmins",employees.findByRole(Role.HR_ADMIN).size());m.put("managers",employees.findByRole(Role.MANAGER).size());m.put("departments",departments.count());m.put("employees",employees.findByRole(Role.EMPLOYEE).size());m.put("activeEmployees",employees.findByRole(Role.EMPLOYEE).stream().filter(x->x.isActive()).count());m.put("offices",offices.count());m.put("recentAuditEvents",audits.count());return m;}
}