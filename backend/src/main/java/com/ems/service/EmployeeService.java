package com.ems.service;

import com.ems.dto.EmployeeRequest;
import com.ems.dto.EmployeeResponse;
import com.ems.model.Employee;
import com.ems.model.Role;
import com.ems.repository.DepartmentRepository;
import com.ems.repository.EmployeeRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final BrevoEmailService emailService;

    public EmployeeService(EmployeeRepository employeeRepository, DepartmentRepository departmentRepository,
                           PasswordEncoder passwordEncoder, BrevoEmailService emailService) {
        this.employeeRepository=employeeRepository; this.departmentRepository=departmentRepository;
        this.passwordEncoder=passwordEncoder; this.emailService=emailService;
    }

    private Role currentRole() {
        Authentication a=SecurityContextHolder.getContext().getAuthentication();
        if(a==null) throw new IllegalStateException("Authentication required");
        if(a.getAuthorities().stream().anyMatch(x->x.getAuthority().equals("ROLE_SYSTEM_ADMIN"))) return Role.SYSTEM_ADMIN;
        if(a.getAuthorities().stream().anyMatch(x->x.getAuthority().equals("ROLE_ADMIN")||x.getAuthority().equals("ROLE_HR_ADMIN"))) return Role.ADMIN;
        if(a.getAuthorities().stream().anyMatch(x->x.getAuthority().equals("ROLE_MANAGER"))) return Role.MANAGER;
        return Role.EMPLOYEE;
    }

    private Role requestedRole(EmployeeRequest req) {
        if(req.getRole()==null||req.getRole().isBlank()) return Role.EMPLOYEE;
        try {
            String r = req.getRole().trim().toUpperCase();
            if("HR_ADMIN".equals(r)) return Role.ADMIN;
            return Role.valueOf(r);
        }
        catch(Exception e) { throw new IllegalArgumentException("Invalid role"); }
    }

    public List<EmployeeResponse> getEmployeesForHrAdmin() {
        return employeeRepository.findByRoleIn(List.of(Role.EMPLOYEE,Role.MANAGER,Role.INTERN)).stream().map(EmployeeResponse::new).toList();
    }

    public List<EmployeeResponse> getAdminsForSystemAdmin() {
        return employeeRepository.findByRoleIn(List.of(Role.ADMIN, Role.HR_ADMIN)).stream().map(EmployeeResponse::new).toList();
    }

    public List<EmployeeResponse> getHrAdminsForSystemAdmin() {
        return getAdminsForSystemAdmin();
    }

    public List<com.ems.dto.DepartmentOption> getActiveDepartmentsForHr() {
        return departmentRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(d -> new com.ems.dto.DepartmentOption(d.getId(), d.getName())).toList();
    }

    public EmployeeResponse getByEmployeeId(String employeeId) {
        return new EmployeeResponse(employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(()->new IllegalArgumentException("Employee not found: "+employeeId)));
    }

    public EmployeeResponse createEmployee(EmployeeRequest req) {
        if(currentRole()!=Role.ADMIN) throw new IllegalArgumentException("Only ADMIN can create employees through this operation.");
        Role requested=requestedRole(req);
        if(requested!=Role.EMPLOYEE && requested!=Role.INTERN) throw new IllegalArgumentException("ADMIN can create EMPLOYEE or INTERN accounts only.");
        return create(req,requested);
    }

    public EmployeeResponse createAdmin(EmployeeRequest req) {
        if(currentRole()!=Role.SYSTEM_ADMIN) throw new IllegalArgumentException("Only SYSTEM_ADMIN can create ADMIN accounts.");
        if(requestedRole(req)!=Role.ADMIN) throw new IllegalArgumentException("SYSTEM_ADMIN can create ADMIN accounts only. SYSTEM_ADMIN is bootstrap-only.");
        return create(req,Role.ADMIN);
    }

    public EmployeeResponse createHrAdmin(EmployeeRequest req) {
        return createAdmin(req);
    }

    private EmployeeResponse create(EmployeeRequest req,Role role) {
        if(employeeRepository.existsByEmployeeId(req.getEmployeeId().trim())) throw new IllegalArgumentException("Employee ID already exists: "+req.getEmployeeId());
        if(req.getPassword()==null||req.getPassword().isBlank()) throw new IllegalArgumentException("Password is required for a new account");
        Employee e=new Employee();
        e.setEmployeeId(req.getEmployeeId().trim()); 
        e.setName(req.getName().trim()); 
        e.setRole(role);
        e.setPassword(passwordEncoder.encode(req.getPassword()));
        copyEditableFields(e,req);
        validateDepartment(e.getDepartment());
        Employee saved=employeeRepository.save(e);
        try {
            if(saved.getEmail()!=null && !saved.getEmail().isBlank()) {
                emailService.sendAccountCreationEmail(saved.getEmail(), saved.getName(), saved.getEmployeeId(), req.getPassword(), saved.getRole().name());
            }
        } catch(Exception ignored){}
        return new EmployeeResponse(saved);
    }

    public EmployeeResponse updateEmployee(Long id,EmployeeRequest req) {
        if(currentRole()!=Role.ADMIN) throw new IllegalArgumentException("Only ADMIN can update employee records.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()!=Role.EMPLOYEE && e.getRole()!=Role.MANAGER && e.getRole()!=Role.INTERN) throw new IllegalArgumentException("ADMIN cannot modify administrator accounts.");
        if(requestedRole(req)!=e.getRole()) throw new IllegalArgumentException("ADMIN cannot change roles.");
        copyEditableFields(e,req); validateDepartment(e.getDepartment());
        if(req.getPassword()!=null&&!req.getPassword().isBlank()) e.setPassword(passwordEncoder.encode(req.getPassword()));
        return new EmployeeResponse(employeeRepository.save(e));
    }

    public EmployeeResponse updateAdmin(Long id,EmployeeRequest req) {
        if(currentRole()!=Role.SYSTEM_ADMIN) throw new IllegalArgumentException("Only SYSTEM_ADMIN can manage ADMIN accounts.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Administrator not found"));
        if(e.getRole()!=Role.ADMIN) throw new IllegalArgumentException("Only ADMIN accounts can be managed here.");
        if(requestedRole(req)!=Role.ADMIN) throw new IllegalArgumentException("Role changes are not allowed here.");
        copyEditableFields(e,req); validateDepartment(e.getDepartment());
        EmployeeResponse out=new EmployeeResponse(employeeRepository.save(e));
        return out;
    }

    public EmployeeResponse updateHrAdmin(Long id,EmployeeRequest req) {
        return updateAdmin(id, req);
    }

    private void validateDepartment(String department) {
        if(department==null||department.isBlank()) throw new IllegalArgumentException("Department is required");
        var d=departmentRepository.findByNameIgnoreCase(department.trim()).orElseThrow(()->new IllegalArgumentException("Select a valid active department created by Organization Admin"));
        if(!d.isActive()) throw new IllegalArgumentException("Selected department is inactive");
    }

    private void copyEditableFields(Employee e,EmployeeRequest req) {
        e.setName(req.getName()); e.setDepartment(req.getDepartment()==null?null:req.getDepartment().trim());
        e.setDesignation(req.getDesignation()); e.setEmail(req.getEmail()); e.setPhoneNumber(req.getPhoneNumber()); e.setAddress(req.getAddress());
        e.setEmergencyContact(req.getEmergencyContact()); e.setProfilePictureUrl(req.getProfilePictureUrl()); e.setJoiningDate(req.getJoiningDate());
    }

    public void setEmployeeActive(Long id,boolean active) {
        if(currentRole()!=Role.ADMIN) throw new IllegalArgumentException("Only ADMIN can activate or deactivate employees.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()!=Role.EMPLOYEE&&e.getRole()!=Role.MANAGER&&e.getRole()!=Role.INTERN) throw new IllegalArgumentException("Administrator accounts cannot be changed here.");
        if(!active&&e.getRole()==Role.MANAGER) throw new IllegalArgumentException("Manager lifecycle is controlled by Organization Admin. Reassign departments and direct reports first.");
        e.setActive(active); employeeRepository.save(e);
    }

    public void setAdminActive(Long id,boolean active) {
        if(currentRole()!=Role.SYSTEM_ADMIN) throw new IllegalArgumentException("Only SYSTEM_ADMIN can manage ADMIN accounts.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Administrator not found"));
        if(e.getRole()!=Role.ADMIN) throw new IllegalArgumentException("Only ADMIN accounts can be changed here.");
        e.setActive(active); employeeRepository.save(e);
    }

    public void setHrAdminActive(Long id,boolean active) {
        setAdminActive(id, active);
    }

    public void archiveEmployee(Long id) {
        if(currentRole()!=Role.ADMIN) throw new IllegalArgumentException("Only ADMIN can archive employees.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()!=Role.EMPLOYEE && e.getRole()!=Role.INTERN) throw new IllegalArgumentException("Managers must be retired by Organization Admin after hierarchy is reassigned.");
        e.setActive(false); employeeRepository.save(e);
    }
}
