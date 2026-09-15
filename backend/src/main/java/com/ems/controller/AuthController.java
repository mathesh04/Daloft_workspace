package com.ems.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ems.dto.EmployeeResponse;
import com.ems.dto.LoginRequest;
import com.ems.dto.LoginResponse;
import com.ems.model.Employee;
import com.ems.model.Role;
import com.ems.repository.EmployeeRepository;
import com.ems.security.JwtUtil;
import com.ems.service.AuditService;
import com.ems.service.SystemSettingsService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final EmployeeRepository employeeRepository; private final PasswordEncoder passwordEncoder; private final JwtUtil jwtUtil;
    private final com.ems.service.PasswordResetService passwordResetService; private final AuditService auditService; private final SystemSettingsService settings;
    public AuthController(EmployeeRepository employeeRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, com.ems.service.PasswordResetService passwordResetService, AuditService auditService, SystemSettingsService settings) {
        this.employeeRepository=employeeRepository;this.passwordEncoder=passwordEncoder;this.jwtUtil=jwtUtil;this.passwordResetService=passwordResetService;this.auditService=auditService;this.settings=settings;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        Employee employee=employeeRepository.findByEmployeeId(request.getEmployeeId()).orElse(null);
        if(employee!=null && employee.getLockedUntil()!=null && employee.getLockedUntil().isAfter(settings.now())) {
            long mins=Math.max(1,java.time.Duration.between(settings.now(),employee.getLockedUntil()).toMinutes()+1);
            auditService.logAuthEvent(employee.getEmployeeId(),"LOGIN_BLOCKED","Account temporarily locked after repeated failed login attempts",employee.getId(),"FAILURE",httpRequest);
            return ResponseEntity.status(423).body(new ErrorBody("Your account is temporarily locked. Please try again in about "+mins+" minute(s)."));
        }
        if(employee==null || !passwordEncoder.matches(request.getPassword(),employee.getPassword())) {
            if(employee!=null){
                int attempts=employee.getLoginFailedAttempts()+1, max=Math.max(1,settings.getInt("MAX_LOGIN_ATTEMPTS",5));
                employee.setLoginFailedAttempts(attempts);
                if(attempts>=max){employee.setLockedUntil(settings.now().plusMinutes(Math.max(1,settings.getInt("ACCOUNT_LOCK_MINUTES",15))));employee.setLoginFailedAttempts(0);}
                employeeRepository.save(employee);
            }
            auditService.logAuthEvent(request.getEmployeeId(),"LOGIN_FAILED","Failed login attempt",employee==null?request.getEmployeeId():employee.getId(),"FAILURE",httpRequest);
            return ResponseEntity.status(401).body(new ErrorBody("Invalid employee ID or password"));
        }
        if(employee.getLockedUntil()!=null){employee.setLockedUntil(null);employee.setLoginFailedAttempts(0);}
        if(!loginEnabled(employee.getRole())) {
            String label = roleLabel(employee.getRole());
            auditService.logAuthEvent(employee.getEmployeeId(),"LOGIN_BLOCKED",label+" login disabled by organization policy",employee.getId(),"FAILURE",httpRequest);
            return ResponseEntity.status(403).body(new ErrorBody(label+" login is currently disabled by your organization administrator."));
        }
        if(!employee.isActive()) {auditService.logAuthEvent(employee.getEmployeeId(),"LOGIN_FAILED","Login blocked for deactivated account",employee.getId(),"FAILURE",httpRequest);return ResponseEntity.status(403).body(new ErrorBody("This account has been deactivated. Contact HR."));}
        if(settings.getBoolean("MAINTENANCE_MODE",false) && employee.getRole()!=Role.SYSTEM_ADMIN) {
            auditService.logAuthEvent(employee.getEmployeeId(),"LOGIN_BLOCKED","System is in maintenance mode",employee.getId(),"FAILURE",httpRequest);
            return ResponseEntity.status(503).body(new ErrorBody("System is currently under maintenance. Please try again later."));
        }
        employeeRepository.save(employee);
        String token=jwtUtil.generateToken(employee.getEmployeeId(),employee.getRole().name());
        LoginResponse response=new LoginResponse(token,employee.getId(),employee.getEmployeeId(),employee.getName(),employee.getRole().name(),employee.getDepartment());
        auditService.logAuthEvent(employee.getEmployeeId(),"LOGIN_SUCCESS","Successful login",employee.getId(),"SUCCESS",httpRequest); return ResponseEntity.ok(response);
    }

    private boolean loginEnabled(Role role){
        if (role == Role.SYSTEM_ADMIN) return true;
        if (role == Role.EMPLOYEE) return settings.getBoolean("EMPLOYEE_LOGIN_ENABLED", true);
        if (role == Role.INTERN) return settings.getBoolean("INTERN_LOGIN_ENABLED", true);
        if (role == Role.MANAGER) return settings.getBoolean("MANAGER_LOGIN_ENABLED", true);
        if (role == Role.HR_ADMIN) return settings.getBoolean("HR_ADMIN_LOGIN_ENABLED", true);
        return false;
    }

    private String roleLabel(Role role){
        if (role == Role.EMPLOYEE) return "Employee";
        if (role == Role.INTERN) return "Intern";
        if (role == Role.MANAGER) return "Manager";
        if (role == Role.HR_ADMIN) return "Administrator";
        if (role == Role.SYSTEM_ADMIN) return "Organization Admin";
        return "User";
    }
    @PostMapping("/forgot-password") public ResponseEntity<?> forgotPassword(@RequestBody Map<String,String> body){String identity=body.getOrDefault("identity","").trim();if(identity.isEmpty())return ResponseEntity.badRequest().body(new ErrorBody("Email or employee ID is required"));try{passwordResetService.request(identity);}catch(Exception ignored){}return ResponseEntity.ok(Map.of("message","If an account matches the details, a reset link has been sent."));}
    @PostMapping("/reset-password") public ResponseEntity<?> resetPassword(@RequestBody Map<String,String> body){try{passwordResetService.reset(body.get("token"),body.get("newPassword"));return ResponseEntity.ok(Map.of("message","Password reset successfully. Please sign in."));}catch(IllegalArgumentException e){return ResponseEntity.badRequest().body(new ErrorBody(e.getMessage()));}}
    @GetMapping("/me/{employeeId}") public ResponseEntity<?> me(@PathVariable String employeeId,org.springframework.security.core.Authentication authentication){boolean elevated=authentication!=null&&authentication.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_SYSTEM_ADMIN"));if(!elevated&&(authentication==null||!authentication.getName().equalsIgnoreCase(employeeId)))return ResponseEntity.status(403).body(new ErrorBody("You can only access your own profile"));return employeeRepository.findByEmployeeId(employeeId).<ResponseEntity<?>>map(e->ResponseEntity.ok(new EmployeeResponse(e))).orElseGet(()->ResponseEntity.status(404).body(new ErrorBody("Not found")));}
    public record ErrorBody(String message){}
}
