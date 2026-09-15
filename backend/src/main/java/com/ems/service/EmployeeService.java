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
        if(a.getAuthorities().stream().anyMatch(x->x.getAuthority().equals("ROLE_HR_ADMIN"))) return Role.HR_ADMIN;
        if(a.getAuthorities().stream().anyMatch(x->x.getAuthority().equals("ROLE_MANAGER"))) return Role.MANAGER;
        return Role.EMPLOYEE;
    }

    private Role requestedRole(EmployeeRequest req) {
        if(req.getRole()==null||req.getRole().isBlank()) return Role.EMPLOYEE;
        try { return Role.valueOf(req.getRole().trim().toUpperCase()); }
        catch(Exception e) { throw new IllegalArgumentException("Invalid role"); }
    }

    public List<EmployeeResponse> getEmployeesForHrAdmin() {
        return employeeRepository.findByRoleIn(List.of(Role.EMPLOYEE,Role.MANAGER,Role.INTERN)).stream().map(EmployeeResponse::new).toList();
    }

    public List<EmployeeResponse> getHrAdminsForSystemAdmin() {
        return employeeRepository.findByRole(Role.HR_ADMIN).stream().map(EmployeeResponse::new).toList();
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
        if(currentRole()!=Role.HR_ADMIN) throw new IllegalArgumentException("Only HR_ADMIN can create employees through this operation.");
        Role requested=requestedRole(req);
        if(requested!=Role.EMPLOYEE && requested!=Role.INTERN) throw new IllegalArgumentException("HR_ADMIN can create EMPLOYEE or INTERN accounts only.");
        return create(req,requested);
    }

    public EmployeeResponse createHrAdmin(EmployeeRequest req) {
        if(currentRole()!=Role.SYSTEM_ADMIN) throw new IllegalArgumentException("Only SYSTEM_ADMIN can create HR_ADMIN accounts.");
        if(requestedRole(req)!=Role.HR_ADMIN) throw new IllegalArgumentException("SYSTEM_ADMIN can create HR_ADMIN accounts only. SYSTEM_ADMIN is bootstrap-only.");
        return create(req,Role.HR_ADMIN);
    }

    private EmployeeResponse create(EmployeeRequest req,Role role) {
        if(employeeRepository.existsByEmployeeId(req.getEmployeeId().trim())) throw new IllegalArgumentException("Employee ID already exists: "+req.getEmployeeId());
        if(req.getPassword()==null||req.getPassword().isBlank()) throw new IllegalArgumentException("Password is required for a new account");
        Employee e=new Employee();
        e.setEmployeeId(req.getEmployeeId().trim()); 
        e.setName(req.getName().trim()); 
        e.setPassword(passwordEncoder.encode(req.getPassword()));
        e.setRole(role); 
        copyEditableFields(e,req); 
        validateDepartment(e.getDepartment());
         e.setReportingManager(null);
          e.setActive(true);
        
        Employee saved=employeeRepository.save(e);
        try { 
        emailService.send(
            saved,
            "Welcome to EMS Management",
            "Welcome " + saved.getName() + ".\n" +
            "Your Employee ID: " + saved.getEmployeeId() + "\n" +
            "Your Password: " + req.getPassword() + "\n" +
            "Login here: " +  "https://daloft-workspace.vercel.app"+ "/login"
        ); 
    } catch(Exception ignored){}
        return new EmployeeResponse(saved);
    }

    public EmployeeResponse updateEmployee(Long id,EmployeeRequest req) {
        if(currentRole()!=Role.HR_ADMIN) throw new IllegalArgumentException("Only HR_ADMIN can update employee records.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()!=Role.EMPLOYEE && e.getRole()!=Role.MANAGER && e.getRole()!=Role.INTERN) throw new IllegalArgumentException("HR_ADMIN cannot modify administrator accounts.");
        if(requestedRole(req)!=e.getRole()) throw new IllegalArgumentException("HR_ADMIN cannot change roles.");
        copyEditableFields(e,req); validateDepartment(e.getDepartment());
        if(req.getPassword()!=null&&!req.getPassword().isBlank()) e.setPassword(passwordEncoder.encode(req.getPassword()));
        return new EmployeeResponse(employeeRepository.save(e));
    }

    public EmployeeResponse updateHrAdmin(Long id,EmployeeRequest req) {
        if(currentRole()!=Role.SYSTEM_ADMIN) throw new IllegalArgumentException("Only SYSTEM_ADMIN can manage HR_ADMIN accounts.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Administrator not found"));
        if(e.getRole()!=Role.HR_ADMIN) throw new IllegalArgumentException("Only HR_ADMIN accounts can be managed here.");
        if(requestedRole(req)!=Role.HR_ADMIN) throw new IllegalArgumentException("Role changes are not allowed here.");
        copyEditableFields(e,req); validateDepartment(e.getDepartment());
        EmployeeResponse out=new EmployeeResponse(employeeRepository.save(e));
        return out;
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
        if(currentRole()!=Role.HR_ADMIN) throw new IllegalArgumentException("Only HR_ADMIN can activate or deactivate employees.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()!=Role.EMPLOYEE&&e.getRole()!=Role.MANAGER&&e.getRole()!=Role.INTERN) throw new IllegalArgumentException("Administrator accounts cannot be changed here.");
        if(!active&&e.getRole()==Role.MANAGER) throw new IllegalArgumentException("Manager lifecycle is controlled by Organization Admin. Reassign departments and direct reports first.");
        e.setActive(active); employeeRepository.save(e);
    }

    public void setHrAdminActive(Long id,boolean active) {
        if(currentRole()!=Role.SYSTEM_ADMIN) throw new IllegalArgumentException("Only SYSTEM_ADMIN can manage HR_ADMIN accounts.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Administrator not found"));
        if(e.getRole()!=Role.HR_ADMIN) throw new IllegalArgumentException("Only HR_ADMIN accounts can be changed here.");
        e.setActive(active); employeeRepository.save(e);
    }

    public void archiveEmployee(Long id) {
        if(currentRole()!=Role.HR_ADMIN) throw new IllegalArgumentException("Only HR_ADMIN can archive employees.");
        Employee e=employeeRepository.findById(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(e.getRole()!=Role.EMPLOYEE && e.getRole()!=Role.INTERN) throw new IllegalArgumentException("Managers must be retired by Organization Admin after hierarchy is reassigned.");
        e.setActive(false); employeeRepository.save(e);
    }
}
