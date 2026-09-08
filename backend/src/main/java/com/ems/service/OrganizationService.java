package com.ems.service;

import com.ems.model.*;
import com.ems.repository.*;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class OrganizationService {
    private static final Set<String> PERMISSIONS = Set.of(
            "ALL","PEOPLE","ATTENDANCE","LEAVE","INVENTORY","TASKS","COMMUNICATION","REPORTS","OFFICE","HOLIDAY_CALENDAR"
    );

    private final DepartmentRepository departments;
    private final EmployeeRepository employees;
    private final AdminAccessRepository access;
    private final AuditService audit;

    public OrganizationService(DepartmentRepository d, EmployeeRepository e, AdminAccessRepository a, AuditService au) {
        departments=d; employees=e; access=a; audit=au;
    }

    private void system(Authentication a) {
        if (a==null || a.getAuthorities().stream().noneMatch(x->x.getAuthority().equals("ROLE_SYSTEM_ADMIN")))
            throw new SecurityException("Organization Admin access required");
    }

    public List<Employee> allEmployees() {
        return employees.findAll().stream().sorted(Comparator.comparing(Employee::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))).toList();
    }

    public List<Department> listDepartments() {
        return departments.findAll(org.springframework.data.domain.Sort.by("name"));
    }

    @Transactional
    public Department createDepartment(String name,String code,Long managerId,Authentication auth) {
        system(auth);
        String normalizedName=normalizeRequired(name,"Department name");
        String normalizedCode=normalizeCode(code);
        if (departments.existsByNameIgnoreCase(normalizedName)) throw new IllegalArgumentException("Department already exists");
        if (normalizedCode!=null && departments.existsByCodeIgnoreCase(normalizedCode)) throw new IllegalArgumentException("Department code already exists");
        Department d=new Department();
        d.setName(normalizedName);
        d.setCode(normalizedCode);
        if(managerId!=null) setManager(d,managerId);
        Department saved=departments.save(d);
        audit.log(auth,"DEPARTMENT_CREATED","Created department "+saved.getName(),"DEPARTMENT",saved.getId(),"SUCCESS",null);
        return saved;
    }

    @Transactional
    public Department updateDepartment(Long id,String name,String code,Long managerId,Boolean clearManager,Boolean active,Authentication auth) {
        system(auth);
        Department d=departments.findById(id).orElseThrow(()->new IllegalArgumentException("Department not found"));
        String oldName=d.getName();
        if(name!=null && !name.isBlank()) {
            String newName=normalizeRequired(name,"Department name");
            if(!newName.equalsIgnoreCase(oldName) && departments.existsByNameIgnoreCase(newName))
                throw new IllegalArgumentException("Department already exists");
            d.setName(newName);
        }
        String normalizedCode = code == null ? d.getCode() : normalizeCode(code);
        if(normalizedCode!=null && (d.getCode()==null || !normalizedCode.equalsIgnoreCase(d.getCode()))
                && departments.existsByCodeIgnoreCase(normalizedCode))
            throw new IllegalArgumentException("Department code already exists");
        d.setCode(normalizedCode);

        if(Boolean.TRUE.equals(clearManager)) d.setManager(null);
        else if(managerId!=null) setManager(d,managerId);

        if(active!=null && !active && d.isActive()) {
            boolean hasEmployees=employees.findByDepartmentIgnoreCaseAndActiveTrue(d.getName()).stream().anyMatch(e->e.getRole()!=Role.SYSTEM_ADMIN && e.getRole()!=Role.HR_ADMIN);
            if(hasEmployees) throw new IllegalArgumentException("Reassign active employees before deactivating this department");
            if(d.getManager()!=null && d.getManager().isActive()) throw new IllegalArgumentException("Remove or reassign the department manager before deactivating this department");
        }
        d.setActive(active==null ? d.isActive() : active);

        Department saved=departments.save(d);
        if(oldName!=null && !oldName.equals(saved.getName())) {
            // Keep the legacy department string synchronized with the canonical Department record.
            employees.findAll().stream()
                    .filter(e->e.getDepartment()!=null && e.getDepartment().equalsIgnoreCase(oldName))
                    .forEach(e->{e.setDepartment(saved.getName()); employees.save(e);});
        }
        audit.log(auth,"DEPARTMENT_UPDATED","Updated department "+saved.getName(),"DEPARTMENT",id,"SUCCESS",null);
        return saved;
    }

    private void setManager(Department d,Long managerId) {
        Employee m=employees.findById(managerId).orElseThrow(()->new IllegalArgumentException("Manager not found"));
        if(!m.isActive()) throw new IllegalArgumentException("Inactive employees cannot be department managers");
        if(m.getRole()!=Role.MANAGER) throw new IllegalArgumentException("Selected employee must have MANAGER role");
        d.setManager(m);
    }

    public List<Employee> eligibleManagers() {
        return employees.findAll().stream().filter(e->e.isActive()&&e.getRole()==Role.MANAGER)
                .sorted(Comparator.comparing(Employee::getName,Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))).toList();
    }

    @Transactional
    public Employee makeManager(Long employeeId,Authentication auth) {
        system(auth);
        Employee e=employees.findById(employeeId).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()==Role.SYSTEM_ADMIN || e.getRole()==Role.HR_ADMIN)
            throw new IllegalArgumentException("Only normal employees can be promoted to Manager");
        if(!e.isActive()) throw new IllegalArgumentException("Inactive employees cannot be promoted to Manager");
        if(e.getRole()==Role.MANAGER) return e;
        e.setRole(Role.MANAGER);
        Employee saved=employees.save(e);
        audit.log(auth,"MANAGER_ROLE_ASSIGNED","Assigned MANAGER role to "+e.getName(),"EMPLOYEE",e.getId(),"SUCCESS",null);
        return saved;
    }

    @Transactional
    public Employee removeManagerRole(Long employeeId,Authentication auth) {
        system(auth);
        Employee e=employees.findById(employeeId).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()!=Role.MANAGER) throw new IllegalArgumentException("Employee is not a manager");
        if(departments.findByManagerId(e.getId()).stream().anyMatch(Department::isActive))
            throw new IllegalArgumentException("Reassign this manager from all active departments first");
        if(!employees.findByReportingManager(e).isEmpty())
            throw new IllegalArgumentException("Reassign this manager's direct reports before removing the Manager role");
        e.setRole(Role.EMPLOYEE);
        Employee saved=employees.save(e);
        audit.log(auth,"MANAGER_ROLE_REMOVED","Removed MANAGER role from "+e.getName(),"EMPLOYEE",e.getId(),"SUCCESS",null);
        return saved;
    }

    @Transactional
    public Employee setManagerActive(Long employeeId, boolean active, Authentication auth) {
        system(auth);
        Employee e=employees.findById(employeeId).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()!=Role.MANAGER) throw new IllegalArgumentException("Employee is not a manager");
        if(!active) {
            if(departments.findByManagerId(e.getId()).stream().anyMatch(Department::isActive))
                throw new IllegalArgumentException("Reassign all active departments before deactivating this manager");
            if(!employees.findByReportingManager(e).isEmpty())
                throw new IllegalArgumentException("Reassign this manager's direct reports before deactivating this manager");
        }
        e.setActive(active);
        Employee saved=employees.save(e);
        audit.log(auth,"MANAGER_STATUS_CHANGED","Set manager "+e.getName()+" to "+(active?"ACTIVE":"INACTIVE"),"EMPLOYEE",e.getId(),"SUCCESS",null);
        return saved;
    }

    @Transactional
    public Employee assignReportingManager(Long employeeId,Long managerId,Authentication auth) {
        system(auth);
        Employee e=employees.findById(employeeId).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()==Role.SYSTEM_ADMIN || e.getRole()==Role.HR_ADMIN) throw new IllegalArgumentException("Administrators do not use employee reporting hierarchy");
        if(managerId==null) { e.setReportingManager(null); }
        else {
            Employee m=employees.findById(managerId).orElseThrow(()->new IllegalArgumentException("Manager not found"));
            if(!m.isActive() || m.getRole()!=Role.MANAGER) throw new IllegalArgumentException("Reporting manager must be an active Manager");
            if(Objects.equals(e.getId(),m.getId())) throw new IllegalArgumentException("Employee cannot report to themselves");
            // Prevent simple cycles in the reporting chain.
            Employee cursor=m;
            int guard=0;
            while(cursor!=null && guard++<100) {
                if(Objects.equals(cursor.getId(),e.getId())) throw new IllegalArgumentException("Reporting manager assignment would create a hierarchy cycle");
                cursor=cursor.getReportingManager();
            }
            e.setReportingManager(m);
        }
        Employee saved=employees.save(e);
        audit.log(auth,"REPORTING_MANAGER_UPDATED","Updated reporting manager for "+e.getName(),"EMPLOYEE",e.getId(),"SUCCESS",null);
        return saved;
    }

    public List<AdminAccess> getAccess(Long employeeId,Authentication auth) {
        system(auth);
        Employee e=employees.findById(employeeId).orElseThrow(()->new IllegalArgumentException("Administrator not found"));
        if(e.getRole()!=Role.HR_ADMIN) throw new IllegalArgumentException("Only HR administrators have delegated access");
        return access.findByEmployeeOrderByPermissionAsc(e);
    }

    @Transactional
    public void replaceAccess(Long employeeId,List<Map<String,Object>> entries,Authentication auth) {
        system(auth);
        Employee e=employees.findByIdForUpdate(employeeId).orElseThrow(()->new IllegalArgumentException("Administrator not found"));
        if(e.getRole()!=Role.HR_ADMIN) throw new IllegalArgumentException("Only HR administrators can receive delegated access");
        if(entries==null) entries=List.of();

        Set<String> seen=new HashSet<>();
        List<AdminAccess> replacement=new ArrayList<>();
        for(Map<String,Object> x:entries) {
            String p=String.valueOf(x.getOrDefault("permission","")).trim().toUpperCase(Locale.ROOT);
            if(p.isBlank()) continue;
            if(!PERMISSIONS.contains(p)) throw new IllegalArgumentException("Unsupported administrator permission: "+p);
            String scope=String.valueOf(x.getOrDefault("scopeType","ORGANIZATION")).trim().toUpperCase(Locale.ROOT);
            if(!"ORGANIZATION".equals(scope)) throw new IllegalArgumentException("Only ORGANIZATION scope is currently supported");
            String key=p+"|ORGANIZATION";
            if(!seen.add(key)) continue;
            AdminAccess a=new AdminAccess();
            a.setEmployee(e); a.setPermission(p); a.setScopeType("ORGANIZATION"); a.setScopeValue(null); a.setActive(true);
            replacement.add(a);
        }
        if(seen.contains("ALL|ORGANIZATION")) {
            replacement.removeIf(a->!"ALL".equals(a.getPermission()));
        }
        access.deleteByEmployeeId(e.getId());
        access.flush();
        if(!replacement.isEmpty()) access.saveAll(replacement);
        access.flush();
        audit.log(auth,"ADMIN_ACCESS_UPDATED","Updated delegated access for "+e.getName(),"EMPLOYEE",e.getId(),"SUCCESS",null);
    }

    private String normalizeRequired(String value,String label) {
        if(value==null || value.isBlank()) throw new IllegalArgumentException(label+" is required");
        return value.trim().replaceAll("\\s+"," ");
    }
    private String normalizeCode(String value) {
        if(value==null || value.isBlank()) return null;
        return value.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+","-");
    }
}
