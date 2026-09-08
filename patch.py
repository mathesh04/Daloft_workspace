from pathlib import Path
root=Path('/mnt/data/ems_work')

def write(rel, text):
    p=root/rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(text, encoding='utf-8')

def append(rel, text):
    p=root/rel; p.write_text(p.read_text(encoding='utf-8')+'\n'+text, encoding='utf-8')

# Settings service
write('backend/src/main/java/com/ems/service/SystemSettingsService.java', r'''package com.ems.service;

import com.ems.model.SystemSetting;
import com.ems.repository.SystemSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class SystemSettingsService {
    private static final Set<String> BOOLEAN_KEYS = Set.of(
            "ATTENDANCE_ENABLED", "CHECK_IN_ENABLED", "CHECK_OUT_ENABLED", "GEOFENCE_ENABLED",
            "MAINTENANCE_MODE", "EMPLOYEE_LOGIN_ENABLED", "MANAGER_LOGIN_ENABLED", "HR_ADMIN_LOGIN_ENABLED"
    );
    private static final Set<String> INTEGER_KEYS = Set.of(
            "GEOFENCE_RADIUS", "LATE_GRACE_MINUTES", "MIN_WORK_MINUTES", "MAX_GPS_ACCURACY",
            "MAX_LOGIN_ATTEMPTS", "ACCOUNT_LOCK_MINUTES", "SESSION_TIMEOUT_MINUTES"
    );
    private static final Map<String, String> DEFAULTS = Map.ofEntries(
            Map.entry("ATTENDANCE_ENABLED", "true"),
            Map.entry("CHECK_IN_ENABLED", "true"),
            Map.entry("CHECK_OUT_ENABLED", "true"),
            Map.entry("GEOFENCE_ENABLED", "false"),
            Map.entry("GEOFENCE_RADIUS", "100"),
            Map.entry("LATE_GRACE_MINUTES", "10"),
            Map.entry("MIN_WORK_MINUTES", "480"),
            Map.entry("MAX_GPS_ACCURACY", "100"),
            Map.entry("MAX_LOGIN_ATTEMPTS", "5"),
            Map.entry("ACCOUNT_LOCK_MINUTES", "15"),
            Map.entry("SESSION_TIMEOUT_MINUTES", "30"),
            Map.entry("MAINTENANCE_MODE", "false"),
            Map.entry("EMPLOYEE_LOGIN_ENABLED", "true"),
            Map.entry("MANAGER_LOGIN_ENABLED", "true"),
            Map.entry("HR_ADMIN_LOGIN_ENABLED", "true"),
            Map.entry("TIMEZONE", "Asia/Kolkata"),
            Map.entry("WORKING_DAYS", "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY")
    );

    private final SystemSettingRepository repository;

    public SystemSettingsService(SystemSettingRepository repository) { this.repository = repository; }

    public boolean getBoolean(String key, boolean fallback) {
        String v = value(key);
        return v == null ? fallback : Boolean.parseBoolean(v);
    }

    public int getInt(String key, int fallback) {
        String v = value(key);
        if (v == null) return fallback;
        try { return Integer.parseInt(v); } catch (NumberFormatException ex) { return fallback; }
    }

    public long getLong(String key, long fallback) {
        String v = value(key);
        if (v == null) return fallback;
        try { return Long.parseLong(v); } catch (NumberFormatException ex) { return fallback; }
    }

    public String getString(String key, String fallback) {
        String v = value(key);
        return v == null || v.isBlank() ? fallback : v;
    }

    public String value(String key) {
        String k = key == null ? "" : key.trim().toUpperCase(Locale.ROOT);
        return repository.findById(k).map(SystemSetting::getValue).orElse(DEFAULTS.get(k));
    }

    public Map<String, Object> allTyped() {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : DEFAULTS.entrySet()) {
            String key = entry.getKey();
            if (BOOLEAN_KEYS.contains(key)) out.put(key, getBoolean(key, Boolean.parseBoolean(entry.getValue())));
            else if (INTEGER_KEYS.contains(key)) out.put(key, getInt(key, Integer.parseInt(entry.getValue())));
            else out.put(key, getString(key, entry.getValue()));
        }
        repository.findAll().forEach(s -> {
            String key = s.getKey();
            if (key == null) return;
            if (BOOLEAN_KEYS.contains(key)) out.put(key, getBoolean(key, false));
            else if (INTEGER_KEYS.contains(key)) out.put(key, getInt(key, 0));
            else out.put(key, s.getValue());
        });
        return out;
    }

    public boolean isKnown(String key) {
        return DEFAULTS.containsKey(key) || BOOLEAN_KEYS.contains(key) || INTEGER_KEYS.contains(key);
    }

    @Transactional
    public Map<String, Object> update(Map<String, ?> body) {
        if (body == null) return allTyped();
        for (Map.Entry<String, ?> e : body.entrySet()) {
            String key = e.getKey() == null ? "" : e.getKey().trim().toUpperCase(Locale.ROOT);
            if (!isKnown(key)) continue;
            String value = normalize(key, e.getValue());
            SystemSetting setting = repository.findById(key).orElseGet(SystemSetting::new);
            setting.setKey(key);
            setting.setValue(value);
            repository.save(setting);
        }
        return allTyped();
    }

    private String normalize(String key, Object raw) {
        if (BOOLEAN_KEYS.contains(key)) {
            if (raw instanceof Boolean b) return String.valueOf(b);
            String s = String.valueOf(raw).trim().toLowerCase(Locale.ROOT);
            if ("true".equals(s) || "false".equals(s)) return s;
            throw new IllegalArgumentException(key.replace('_', ' ') + " must be true or false");
        }
        if (INTEGER_KEYS.contains(key)) {
            int value;
            try { value = raw instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(raw).trim()); }
            catch (Exception ex) { throw new IllegalArgumentException(key.replace('_', ' ') + " must be a valid number"); }
            if (key.equals("GEOFENCE_RADIUS") && (value < 1 || value > 50000)) throw new IllegalArgumentException("Geofence radius must be between 1 and 50,000 meters");
            if (key.equals("MAX_GPS_ACCURACY") && (value < 1 || value > 5000)) throw new IllegalArgumentException("Maximum GPS accuracy must be between 1 and 5,000 meters");
            if (key.equals("LATE_GRACE_MINUTES") && (value < 0 || value > 1440)) throw new IllegalArgumentException("Late grace period must be between 0 and 1,440 minutes");
            if (key.equals("MIN_WORK_MINUTES") && (value < 0 || value > 1440)) throw new IllegalArgumentException("Minimum work duration must be between 0 and 1,440 minutes");
            if (key.equals("MAX_LOGIN_ATTEMPTS") && (value < 1 || value > 20)) throw new IllegalArgumentException("Maximum login attempts must be between 1 and 20");
            if (key.equals("ACCOUNT_LOCK_MINUTES") && (value < 1 || value > 1440)) throw new IllegalArgumentException("Account lock duration must be between 1 and 1,440 minutes");
            if (key.equals("SESSION_TIMEOUT_MINUTES") && (value < 5 || value > 1440)) throw new IllegalArgumentException("Session timeout must be between 5 and 1,440 minutes");
            return String.valueOf(value);
        }
        String text = raw == null ? "" : String.valueOf(raw).trim();
        if ("TIMEZONE".equals(key) && text.isBlank()) throw new IllegalArgumentException("Timezone is required");
        return text;
    }
}
''')

# Holiday domain
write('backend/src/main/java/com/ems/model/OrganizationHoliday.java', r'''package com.ems.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "organization_holidays", uniqueConstraints = @UniqueConstraint(columnNames = {"holiday_date"}),
       indexes = @Index(name = "idx_org_holiday_date", columnList = "holiday_date"))
public class OrganizationHoliday {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 160) private String name;
    @Column(name = "holiday_date", nullable = false) private LocalDate holidayDate;
    @Column(length = 1000) private String description;
    @Column(nullable = false, length = 50) private String type = "PUBLIC";
    @Column(nullable = false) private boolean recurring = false;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt = LocalDateTime.now();
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt = LocalDateTime.now();
    @Column(name = "created_by") private String createdBy;
    @Column(name = "updated_by") private String updatedBy;

    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;}
    public LocalDate getHolidayDate(){return holidayDate;} public void setHolidayDate(LocalDate v){holidayDate=v;}
    public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public String getType(){return type;} public void setType(String v){type=v;}
    public boolean isRecurring(){return recurring;} public void setRecurring(boolean v){recurring=v;}
    public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
    public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getUpdatedAt(){return updatedAt;}
    public String getCreatedBy(){return createdBy;} public void setCreatedBy(String v){createdBy=v;}
    public String getUpdatedBy(){return updatedBy;} public void setUpdatedBy(String v){updatedBy=v;}
}
''')
write('backend/src/main/java/com/ems/repository/OrganizationHolidayRepository.java', r'''package com.ems.repository;

import com.ems.model.OrganizationHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OrganizationHolidayRepository extends JpaRepository<OrganizationHoliday, Long> {
    List<OrganizationHoliday> findByHolidayDateBetweenAndActiveTrueOrderByHolidayDateAsc(LocalDate from, LocalDate to);
    List<OrganizationHoliday> findByHolidayDateBetweenOrderByHolidayDateAsc(LocalDate from, LocalDate to);
    boolean existsByHolidayDate(LocalDate date);
    Optional<OrganizationHoliday> findByHolidayDate(LocalDate date);
}
''')
write('backend/src/main/java/com/ems/service/HolidayService.java', r'''package com.ems.service;

import com.ems.model.OrganizationHoliday;
import com.ems.repository.OrganizationHolidayRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@Service
public class HolidayService {
    private final OrganizationHolidayRepository repository;
    private final SystemSettingsService settings;
    private final AuditService audit;

    public HolidayService(OrganizationHolidayRepository repository, SystemSettingsService settings, AuditService audit) {
        this.repository = repository; this.settings = settings; this.audit = audit;
    }

    public List<OrganizationHoliday> byYear(int year, boolean activeOnly) {
        LocalDate from = LocalDate.of(year,1,1), to = LocalDate.of(year,12,31);
        return activeOnly ? repository.findByHolidayDateBetweenAndActiveTrueOrderByHolidayDateAsc(from,to)
                : repository.findByHolidayDateBetweenOrderByHolidayDateAsc(from,to);
    }

    public boolean isHoliday(LocalDate date) {
        return date != null && repository.findByHolidayDate(date).map(OrganizationHoliday::isActive).orElse(false);
    }

    public boolean isWorkingDay(LocalDate date) {
        if (date == null) return false;
        Set<String> workingDays = Arrays.stream(settings.getString("WORKING_DAYS", "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(","))
                .map(String::trim).filter(s -> !s.isBlank()).map(String::toUpperCase).collect(java.util.stream.Collectors.toSet());
        return workingDays.contains(date.getDayOfWeek().name()) && !isHoliday(date);
    }

    public long countWorkingDays(LocalDate start, LocalDate end) {
        if (start == null || end == null || end.isBefore(start)) return 0;
        long count = 0;
        for (LocalDate d=start; !d.isAfter(end); d=d.plusDays(1)) if (isWorkingDay(d)) count++;
        return count;
    }

    @Transactional
    public OrganizationHoliday create(OrganizationHoliday h, Authentication auth) {
        validate(h, null);
        h.setType(normalizeType(h.getType())); h.setName(clean(h.getName()));
        h.setCreatedBy(actor(auth)); h.setUpdatedBy(actor(auth));
        OrganizationHoliday saved=repository.save(h);
        audit.log(auth,"HOLIDAY_CREATED","Created holiday " + saved.getName(),"HOLIDAY",saved.getId(),"SUCCESS",null);
        return saved;
    }

    @Transactional
    public OrganizationHoliday update(Long id, OrganizationHoliday input, Authentication auth) {
        OrganizationHoliday h=repository.findById(id).orElseThrow(()->new IllegalArgumentException("Holiday not found"));
        validate(input, id);
        h.setName(clean(input.getName())); h.setHolidayDate(input.getHolidayDate()); h.setDescription(input.getDescription());
        h.setType(normalizeType(input.getType())); h.setRecurring(input.isRecurring()); h.setActive(input.isActive()); h.setUpdatedBy(actor(auth));
        OrganizationHoliday saved=repository.save(h);
        audit.log(auth,"HOLIDAY_UPDATED","Updated holiday " + saved.getName(),"HOLIDAY",saved.getId(),"SUCCESS",null);
        return saved;
    }

    @Transactional
    public OrganizationHoliday setActive(Long id, boolean active, Authentication auth) {
        OrganizationHoliday h=repository.findById(id).orElseThrow(()->new IllegalArgumentException("Holiday not found"));
        h.setActive(active); h.setUpdatedBy(actor(auth)); OrganizationHoliday saved=repository.save(h);
        audit.log(auth,"HOLIDAY_STATUS_CHANGED","Set holiday " + saved.getName() + " to " + (active?"ACTIVE":"INACTIVE"),"HOLIDAY",id,"SUCCESS",null);
        return saved;
    }

    @Transactional
    public void delete(Long id, Authentication auth) {
        OrganizationHoliday h=repository.findById(id).orElseThrow(()->new IllegalArgumentException("Holiday not found"));
        repository.delete(h);
        audit.log(auth,"HOLIDAY_DELETED","Deleted holiday " + h.getName(),"HOLIDAY",id,"SUCCESS",null);
    }

    private void validate(OrganizationHoliday h, Long currentId) {
        if (h == null) throw new IllegalArgumentException("Holiday data is required");
        if (h.getName()==null || h.getName().isBlank()) throw new IllegalArgumentException("Holiday name is required");
        if (h.getHolidayDate()==null) throw new IllegalArgumentException("Holiday date is required");
        repository.findByHolidayDate(h.getHolidayDate()).ifPresent(existing -> {
            if (currentId == null || !Objects.equals(existing.getId(), currentId)) throw new IllegalArgumentException("A holiday already exists for this date");
        });
        if (h.getName().trim().length() > 160) throw new IllegalArgumentException("Holiday name is too long");
    }

    private String normalizeType(String t) { String s=(t==null?"PUBLIC":t).trim().toUpperCase(Locale.ROOT); return s.isBlank()?"PUBLIC":s; }
    private String clean(String s) { return s.trim().replaceAll("\\s+"," "); }
    private String actor(Authentication a) { return a==null?"SYSTEM":a.getName(); }
}
''')
write('backend/src/main/java/com/ems/controller/HolidayController.java', r'''package com.ems.controller;

import com.ems.model.OrganizationHoliday;
import com.ems.service.HolidayService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/admin/holidays")
public class HolidayController {
    private final HolidayService service;
    public HolidayController(HolidayService service){this.service=service;}

    @GetMapping
    public List<OrganizationHoliday> list(@RequestParam(defaultValue="2026") int year,
                                           @RequestParam(defaultValue="false") boolean includeInactive){
        return service.byYear(year, !includeInactive);
    }

    @GetMapping("/check")
    public Map<String,Object> check(@RequestParam String date){
        LocalDate d=LocalDate.parse(date); return Map.of("date",d,"holiday",service.isHoliday(d),"workingDay",service.isWorkingDay(d));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody OrganizationHoliday holiday, Authentication auth){
        try{return ResponseEntity.status(201).body(service.create(holiday,auth));}
        catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,@RequestBody OrganizationHoliday holiday,Authentication auth){
        try{return ResponseEntity.ok(service.update(id,holiday,auth));}
        catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> status(@PathVariable Long id,@RequestBody Map<String,Boolean> body,Authentication auth){
        try{return ResponseEntity.ok(service.setActive(id,Boolean.TRUE.equals(body.get("active")),auth));}
        catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,Authentication auth){
        try{service.delete(id,auth);return ResponseEntity.ok(Map.of("message","Holiday deleted"));}
        catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    }
}
''')

# Authentication + lockout + dynamic JWT
write('backend/src/main/java/com/ems/security/JwtUtil.java', r'''package com.ems.security;

import com.ems.service.SystemSettingsService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {
    @Value("${jwt.secret}") private String secret;
    @Value("${jwt.expiration-ms}") private long defaultExpirationMs;
    private final SystemSettingsService settings;
    public JwtUtil(SystemSettingsService settings){this.settings=settings;}
    private SecretKey key(){return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));}
    public String generateToken(String employeeId,String role){
        Date now=new Date(); long minutes=settings.getLong("SESSION_TIMEOUT_MINUTES", defaultExpirationMs/60000L); Date expiry=new Date(now.getTime()+Math.max(5,minutes)*60_000L);
        return Jwts.builder().subject(employeeId).claim("role",role).issuedAt(now).expiration(expiry).signWith(key()).compact();
    }
    public String extractEmployeeId(String token){return extractClaim(token,Claims::getSubject);}
    public String extractRole(String token){return extractClaim(token,claims->claims.get("role",String.class));}
    public boolean isTokenValid(String token){try{return !extractClaim(token,Claims::getExpiration).before(new Date());}catch(Exception e){return false;}}
    private <T>T extractClaim(String token,Function<Claims,T> resolver){return resolver.apply(Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload());}
}
''')

# Patch Employee with login fields
p=root/'backend/src/main/java/com/ems/model/Employee.java'; s=p.read_text()
s=s.replace('    @Column(nullable = false)\n    private boolean active = true;','    @Column(nullable = false)\n    private boolean active = true;\n\n    @Column(name = "login_failed_attempts", nullable = false)\n    private int loginFailedAttempts = 0;\n\n    @Column(name = "locked_until")\n    private LocalDateTime lockedUntil;')
s=s.replace('    public void setActive(boolean active) { this.active = active; }','    public void setActive(boolean active) { this.active = active; }\n\n    public int getLoginFailedAttempts() { return loginFailedAttempts; }\n    public void setLoginFailedAttempts(int v) { loginFailedAttempts = Math.max(0, v); }\n    public LocalDateTime getLockedUntil() { return lockedUntil; }\n    public void setLockedUntil(LocalDateTime v) { lockedUntil = v; }')
p.write_text(s)

write('backend/src/main/java/com/ems/controller/AuthController.java', r'''package com.ems.controller;

import com.ems.dto.EmployeeResponse;
import com.ems.dto.LoginRequest;
import com.ems.dto.LoginResponse;
import com.ems.model.Employee;
import com.ems.model.Role;
import com.ems.repository.EmployeeRepository;
import com.ems.security.JwtUtil;
import com.ems.service.AuditService;
import com.ems.service.SystemSettingsService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.util.Map;

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
        if(employee==null || !passwordEncoder.matches(request.getPassword(),employee.getPassword())) {
            if(employee!=null){
                int attempts=employee.getLoginFailedAttempts()+1, max=settings.getInt("MAX_LOGIN_ATTEMPTS",5);
                employee.setLoginFailedAttempts(attempts);
                if(attempts>=max){employee.setLockedUntil(LocalDateTime.now().plusMinutes(settings.getInt("ACCOUNT_LOCK_MINUTES",15)));employee.setLoginFailedAttempts(0);}
                employeeRepository.save(employee);
            }
            auditService.logAuthEvent(request.getEmployeeId(),"LOGIN_FAILED","Failed login attempt",employee==null?request.getEmployeeId():employee.getId(),"FAILURE",httpRequest);
            return ResponseEntity.status(401).body(new ErrorBody("Invalid employee ID or password"));
        }
        if(employee.getLockedUntil()!=null && employee.getLockedUntil().isAfter(LocalDateTime.now())) {
            long mins=Math.max(1,java.time.Duration.between(LocalDateTime.now(),employee.getLockedUntil()).toMinutes()+1);
            auditService.logAuthEvent(employee.getEmployeeId(),"LOGIN_BLOCKED","Account temporarily locked after repeated failed login attempts",employee.getId(),"FAILURE",httpRequest);
            return ResponseEntity.status(423).body(new ErrorBody("Your account is temporarily locked. Please try again in about "+mins+" minute(s)."));
        }
        if(employee.getLockedUntil()!=null){employee.setLockedUntil(null);employee.setLoginFailedAttempts(0);}
        if(!loginEnabled(employee.getRole())) {
            String label=switch(employee.getRole()){case EMPLOYEE->"Employee";case MANAGER->"Manager";case HR_ADMIN->"Administrator";case SYSTEM_ADMIN->"Organization Admin";};
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

    private boolean loginEnabled(Role role){ return switch(role){case SYSTEM_ADMIN->true;case EMPLOYEE->settings.getBoolean("EMPLOYEE_LOGIN_ENABLED",true);case MANAGER->settings.getBoolean("MANAGER_LOGIN_ENABLED",true);case HR_ADMIN->settings.getBoolean("HR_ADMIN_LOGIN_ENABLED",true);}; }
    @PostMapping("/forgot-password") public ResponseEntity<?> forgotPassword(@RequestBody Map<String,String> body){String identity=body.getOrDefault("identity","").trim();if(identity.isEmpty())return ResponseEntity.badRequest().body(new ErrorBody("Email or employee ID is required"));try{passwordResetService.request(identity);}catch(Exception ignored){}return ResponseEntity.ok(Map.of("message","If an account matches the details, a reset link has been sent."));}
    @PostMapping("/reset-password") public ResponseEntity<?> resetPassword(@RequestBody Map<String,String> body){try{passwordResetService.reset(body.get("token"),body.get("newPassword"));return ResponseEntity.ok(Map.of("message","Password reset successfully. Please sign in."));}catch(IllegalArgumentException e){return ResponseEntity.badRequest().body(new ErrorBody(e.getMessage()));}}
    @GetMapping("/me/{employeeId}") public ResponseEntity<?> me(@PathVariable String employeeId,org.springframework.security.core.Authentication authentication){boolean elevated=authentication!=null&&authentication.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_SYSTEM_ADMIN"));if(!elevated&&(authentication==null||!authentication.getName().equalsIgnoreCase(employeeId)))return ResponseEntity.status(403).body(new ErrorBody("You can only access your own profile"));return employeeRepository.findByEmployeeId(employeeId).<ResponseEntity<?>>map(e->ResponseEntity.ok(new EmployeeResponse(e))).orElseGet(()->ResponseEntity.status(404).body(new ErrorBody("Not found")));}
    public record ErrorBody(String message){}
}
''')

# Maintenance filter
write('backend/src/main/java/com/ems/filter/MaintenanceModeFilter.java', r'''package com.ems.filter;

import com.ems.service.SystemSettingsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public class MaintenanceModeFilter extends OncePerRequestFilter {
    private final SystemSettingsService settings;
    public MaintenanceModeFilter(SystemSettingsService settings){this.settings=settings;}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
        String path=request.getRequestURI();
        var auth=SecurityContextHolder.getContext().getAuthentication();
        boolean system=auth!=null&&auth.isAuthenticated()&&auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_SYSTEM_ADMIN"));
        if(settings.getBoolean("MAINTENANCE_MODE",false) && path.startsWith("/api/") && !path.startsWith("/api/auth/") && !system){
            response.setStatus(503);response.setContentType("application/json");response.getWriter().write("{\"message\":\"System is currently under maintenance. Please try again later.\"}");return;
        }
        chain.doFilter(request,response);
    }
}
''')

# Security config patch
p=root/'backend/src/main/java/com/ems/config/SecurityConfig.java'; s=p.read_text()
s=s.replace('public AdminAccessFilter adminAccessFilter(com.ems.service.AdminAccessService s){ return new AdminAccessFilter(s); }','public AdminAccessFilter adminAccessFilter(com.ems.service.AdminAccessService s){ return new AdminAccessFilter(s); }\n\n    @Bean\n    public MaintenanceModeFilter maintenanceModeFilter(com.ems.service.SystemSettingsService s){ return new MaintenanceModeFilter(s); }')
s=s.replace('public SecurityFilterChain filterChain(HttpSecurity http, AdminAccessFilter adminAccessFilter, AuditRequestFilter auditRequestFilter) throws Exception {','public SecurityFilterChain filterChain(HttpSecurity http, AdminAccessFilter adminAccessFilter, AuditRequestFilter auditRequestFilter, MaintenanceModeFilter maintenanceModeFilter) throws Exception {')
s=s.replace('.addFilterAfter(adminAccessFilter, AuditRequestFilter.class);','.addFilterAfter(adminAccessFilter, AuditRequestFilter.class)\n            .addFilterAfter(maintenanceModeFilter, JwtAuthFilter.class);')
p.write_text(s)

# AdminAccess service endpoint
write('backend/src/main/java/com/ems/controller/AdminAccessController.java', r'''package com.ems.controller;
import com.ems.model.Role;
import com.ems.repository.EmployeeRepository;
import com.ems.service.AdminAccessService;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/admin/access")
public class AdminAccessController {
    private final EmployeeRepository employees; private final AdminAccessService access;
    public AdminAccessController(EmployeeRepository e,AdminAccessService a){employees=e;access=a;}
    @GetMapping("/me") public Map<String,Object> me(org.springframework.security.core.Authentication auth){
        String id=auth.getName(); Role role=employees.findByEmployeeId(id).map(e->e.getRole()).orElseThrow();
        if(role==Role.SYSTEM_ADMIN) return Map.of("role",role.name(),"permissions",List.of("ALL"));
        return Map.of("role",role.name(),"permissions",access.permissions(id));
    }
}
''')
p=root/'backend/src/main/java/com/ems/service/AdminAccessService.java'; s=p.read_text()
s=s.replace('import java.util.Locale;','import java.util.Locale;\nimport java.util.List;\nimport java.util.stream.Collectors;')
s=s.replace('    public boolean allowed(String employeeId,String permission){','    public List<String> permissions(String employeeId){\n        Employee e=employees.findByEmployeeId(employeeId).orElse(null);\n        if(e==null || e.getRole()!=Role.HR_ADMIN) return List.of("ALL");\n        return repo.findByEmployeeOrderByPermissionAsc(e).stream()\n                .filter(a->a.isActive() && "ORGANIZATION".equalsIgnoreCase(a.getScopeType()))\n                .map(a->a.getPermission().toUpperCase(Locale.ROOT)).distinct().sorted().collect(Collectors.toList());\n    }\n\n    public boolean allowed(String employeeId,String permission){')
s=s.replace('        return repo.findByEmployeeOrderByPermissionAsc(e).stream()','        return repo.findByEmployeeOrderByPermissionAsc(e).stream()',1)
p.write_text(s)

# AdminAccessFilter holiday mapping and access endpoint bypass
p=root/'backend/src/main/java/com/ems/filter/AdminAccessFilter.java'; s=p.read_text()
s=s.replace('if(p.contains("/tasks"))return "TASKS";return null;','if(p.contains("/tasks"))return "TASKS";if(p.contains("/holidays"))return "HOLIDAY_CALENDAR";return null;')
p.write_text(s)

# Audit repository typed date queries
write('backend/src/main/java/com/ems/repository/AuditLogRepository.java', r'''package com.ems.repository;
import com.ems.model.AuditLog;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
public interface AuditLogRepository extends JpaRepository<AuditLog,Long>{
 List<AuditLog> findTop50ByOrderByCreatedAtDesc();
 @Query("select a from AuditLog a where :actor = '' or lower(a.actor) like lower(concat('%',:actor,'%')) and :action = '' or lower(a.action) like lower(concat('%',:action,'%'))") Page<AuditLog> searchWithoutDates(@Param("actor") String actor,@Param("action") String action,Pageable pageable);
 @Query("select a from AuditLog a where (:actor = '' or lower(a.actor) like lower(concat('%',:actor,'%'))) and (:action = '' or lower(a.action) like lower(concat('%',:action,'%'))) and a.createdAt >= :fromDate") Page<AuditLog> searchFromDate(@Param("actor") String actor,@Param("action") String action,@Param("fromDate") LocalDateTime fromDate,Pageable pageable);
 @Query("select a from AuditLog a where (:actor = '' or lower(a.actor) like lower(concat('%',:actor,'%'))) and (:action = '' or lower(a.action) like lower(concat('%',:action,'%'))) and a.createdAt <= :toDate") Page<AuditLog> searchToDate(@Param("actor") String actor,@Param("action") String action,@Param("toDate") LocalDateTime toDate,Pageable pageable);
 @Query("select a from AuditLog a where (:actor = '' or lower(a.actor) like lower(concat('%',:actor,'%'))) and (:action = '' or lower(a.action) like lower(concat('%',:action,'%'))) and a.createdAt >= :fromDate and a.createdAt <= :toDate") Page<AuditLog> searchDateRange(@Param("actor") String actor,@Param("action") String action,@Param("fromDate") LocalDateTime fromDate,@Param("toDate") LocalDateTime toDate,Pageable pageable);
}
''')
# The searchWithoutDates query needs parentheses to avoid precedence ambiguity.
p=root/'backend/src/main/java/com/ems/repository/AuditLogRepository.java'; ss=p.read_text().replace('where :actor = \'\' or lower(a.actor) like lower(concat(\'%\',:actor,\'%\')) and :action = \'\' or lower(a.action) like lower(concat(\'%\',:action,\'%\'))','where (:actor = \'\' or lower(a.actor) like lower(concat(\'%\',:actor,\'%\'))) and (:action = \'\' or lower(a.action) like lower(concat(\'%\',:action,\'%\')))') ; p.write_text(ss)

# SystemAdminControlController rewrite
write('backend/src/main/java/com/ems/controller/SystemAdminControlController.java', r'''package com.ems.controller;
import com.ems.model.*; import com.ems.repository.*; import com.ems.service.*; import javax.sql.DataSource; import org.springframework.data.domain.*; import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import org.springframework.transaction.annotation.Transactional; import org.springframework.security.core.Authentication; import java.sql.Connection; import java.time.*; import java.util.*;
@RestController @RequestMapping("/api/system-admin")
public class SystemAdminControlController {
 private final AuditLogRepository audits; private final EmployeeRepository employees; private final OfficeLocationRepository offices; private final DataSource dataSource; private final BrevoEmailService emailService; private final DepartmentRepository departments; private final SystemSettingsService settingService; private final AuditService auditService;
 public SystemAdminControlController(AuditLogRepository a,EmployeeRepository e,OfficeLocationRepository o,DataSource ds,BrevoEmailService es,DepartmentRepository dep,SystemSettingsService ss,AuditService as){audits=a;employees=e;offices=o;dataSource=ds;emailService=es;departments=dep;settingService=ss;auditService=as;}
 @GetMapping("/audit-logs") public Page<AuditLog> logs(@RequestParam(required=false) String actor,@RequestParam(required=false) String action,@RequestParam(required=false) String from,@RequestParam(required=false) String to,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){size=Math.min(Math.max(size,1),100);String a=blank(actor),x=blank(action);LocalDateTime f=from==null||from.isBlank()?null:LocalDate.parse(from).atStartOfDay();LocalDateTime t=to==null||to.isBlank()?null:LocalDate.parse(to).atTime(LocalTime.MAX);Pageable p=PageRequest.of(Math.max(page,0),size,Sort.by(Sort.Direction.DESC,"createdAt"));if(f==null&&t==null)return audits.searchWithoutDates(a,x,p);if(f!=null&&t==null)return audits.searchFromDate(a,x,f,p);if(f==null)return audits.searchToDate(a,x,t,p);return audits.searchDateRange(a,x,f,t,p);}
 @GetMapping(value="/audit-logs/export",produces="text/csv") public ResponseEntity<String> export(@RequestParam(required=false) String actor,@RequestParam(required=false) String action,@RequestParam(required=false) String from,@RequestParam(required=false) String to){Page<AuditLog> p=logs(actor,action,from,to,0,100);StringBuilder b=new StringBuilder("Timestamp,Actor,Action,Details\n");for(AuditLog x:p)b.append(csv(x.getCreatedAt())).append(',').append(csv(x.getActor())).append(',').append(csv(x.getAction())).append(',').append(csv(x.getDetails())).append('\n');return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=audit-logs.csv").body(b.toString());}
 @GetMapping("/settings") public Map<String,Object> getSettings(){return settingService.allTyped();}
 @PutMapping("/settings") @Transactional public ResponseEntity<?> saveSettings(@RequestBody Map<String,Object> body,Authentication auth){try{validateProtectedLoginPolicy(body);Map<String,Object> out=settingService.update(body);auditService.log(auth,"SYSTEM_SETTINGS_UPDATED","Updated organization configuration","SYSTEM_SETTING","organization","SUCCESS",null);return ResponseEntity.ok(out);}catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}}
 private void validateProtectedLoginPolicy(Map<String,Object> body){boolean employee=bool(body,"EMPLOYEE_LOGIN_ENABLED",settingService.getBoolean("EMPLOYEE_LOGIN_ENABLED",true));boolean manager=bool(body,"MANAGER_LOGIN_ENABLED",settingService.getBoolean("MANAGER_LOGIN_ENABLED",true));boolean hr=bool(body,"HR_ADMIN_LOGIN_ENABLED",settingService.getBoolean("HR_ADMIN_LOGIN_ENABLED",true));long adminCount=employees.findByRole(Role.SYSTEM_ADMIN).stream().filter(Employee::isActive).count();if(adminCount<=0)throw new IllegalStateException("At least one active Organization Admin account must exist");if(adminCount==1 && Boolean.FALSE.equals(body.get("SYSTEM_ADMIN_LOGIN_ENABLED")))throw new IllegalArgumentException("Organization Admin login is protected and cannot be disabled");/* lower roles may all be disabled safely while protected admin access remains */ }
 private boolean bool(Map<String,Object> b,String k,boolean def){Object v=b.get(k);if(v==null)return def;if(v instanceof Boolean x)return x;return Boolean.parseBoolean(String.valueOf(v));}
 @GetMapping("/health") public Map<String,Object> health(){Map<String,Object> m=new LinkedHashMap<>();m.put("backend","ONLINE");boolean db=false;try(Connection c=dataSource.getConnection()){db=c.isValid(2);}catch(Exception ignored){}m.put("database",db?"CONNECTED":"DISCONNECTED");m.put("email",emailService.configured()?"CONFIGURED":"NOT_CONFIGURED");m.put("storage","NOT_CONFIGURED");m.put("checkedAt",LocalDateTime.now());return m;}
 @GetMapping("/security/summary") public Map<String,Object> security(){Map<String,Object> m=new LinkedHashMap<>();long failed=audits.searchWithoutDates("","LOGIN_FAILED",PageRequest.of(0,1)).getTotalElements();long resets=audits.searchWithoutDates("","PASSWORD_RESET",PageRequest.of(0,1)).getTotalElements();long locked=employees.findAll().stream().filter(e->e.getLockedUntil()!=null&&e.getLockedUntil().isAfter(LocalDateTime.now())).count();m.put("failedLogins",failed);m.put("passwordResets",resets);m.put("lockedAccounts",locked);m.put("inactiveAccounts",employees.findAll().stream().filter(e->!e.isActive()).count());m.put("recentEvents",audits.findAll(PageRequest.of(0,5,Sort.by(Sort.Direction.DESC,"createdAt"))).getContent());return m;}
 @GetMapping("/offices") public List<OfficeLocation> officeList(){return offices.findAll();}
 @PostMapping("/offices") public OfficeLocation createOffice(@RequestBody OfficeLocation o,Authentication auth){validateOffice(o);OfficeLocation saved=offices.save(o);auditService.log(auth,"CREATE_OFFICE",saved.getName(),"OFFICE",saved.getId(),"SUCCESS",null);return saved;}
 @PutMapping("/offices/{id}") public OfficeLocation updateOffice(@PathVariable Long id,@RequestBody OfficeLocation x,Authentication auth){OfficeLocation o=offices.findById(id).orElseThrow(()->new NoSuchElementException("Office not found"));o.setName(x.getName());o.setAddress(x.getAddress());o.setLatitude(x.getLatitude());o.setLongitude(x.getLongitude());o.setRadiusMeters(x.getRadiusMeters());o.setActive(x.isActive());validateOffice(o);OfficeLocation saved=offices.save(o);auditService.log(auth,"UPDATE_OFFICE",saved.getName(),"OFFICE",saved.getId(),"SUCCESS",null);return saved;}
 @PatchMapping("/offices/{id}/status") public OfficeLocation officeStatus(@PathVariable Long id,@RequestBody Map<String,Boolean> body,Authentication auth){OfficeLocation o=offices.findById(id).orElseThrow();o.setActive(Boolean.TRUE.equals(body.get("active")));OfficeLocation saved=offices.save(o);auditService.log(auth,"OFFICE_STATUS_CHANGED",saved.getName(),"OFFICE",saved.getId(),"SUCCESS",null);return saved;}
 @Transactional(readOnly=true) @GetMapping(value="/reports/organization",produces="text/csv") public ResponseEntity<String> organizationReport(){StringBuilder b=new StringBuilder("Employee ID,Name,Role,Department,Reporting Manager,Designation,Email,Status,Joining Date\n");for(Employee e:employees.findAll(Sort.by("name")))b.append(csv(e.getEmployeeId())).append(',').append(csv(e.getName())).append(',').append(csv(e.getRole())).append(',').append(csv(e.getDepartment())).append(',').append(csv(e.getReportingManager()==null?"":e.getReportingManager().getName())).append(',').append(csv(e.getDesignation())).append(',').append(csv(e.getEmail())).append(',').append(csv(e.isActive()?"ACTIVE":"INACTIVE")).append(',').append(csv(e.getJoiningDate())).append('\n');return csvResponse(b.toString(),"organization-people-report.csv");}
 @Transactional(readOnly=true) @GetMapping(value="/reports/departments",produces="text/csv") public ResponseEntity<String> departmentReport(){StringBuilder b=new StringBuilder("Department,Code,Manager,Active Employees,Status\n");for(Department d:departments.findAll(Sort.by("name"))){long count=employees.findByDepartmentIgnoreCaseAndActiveTrue(d.getName()).stream().filter(e->e.getRole()!=Role.SYSTEM_ADMIN&&e.getRole()!=Role.HR_ADMIN).count();b.append(csv(d.getName())).append(',').append(csv(d.getCode())).append(',').append(csv(d.getManager()==null?"":d.getManager().getName())).append(',').append(count).append(',').append(d.isActive()?"ACTIVE":"INACTIVE").append('\n');}return csvResponse(b.toString(),"organization-department-report.csv");}
 @Transactional(readOnly=true) @GetMapping(value="/reports/managers",produces="text/csv") public ResponseEntity<String> managerReport(){StringBuilder b=new StringBuilder("Manager ID,Manager,Status,Managed Departments,Direct Reports\n");for(Employee m:employees.findByRole(Role.MANAGER)){long dept=departments.findByManagerId(m.getId()).stream().filter(Department::isActive).count();long reports=employees.findByReportingManager(m).stream().filter(Employee::isActive).count();b.append(csv(m.getEmployeeId())).append(',').append(csv(m.getName())).append(',').append(csv(m.isActive()?"ACTIVE":"INACTIVE")).append(',').append(dept).append(',').append(reports).append('\n');}return csvResponse(b.toString(),"organization-manager-report.csv");}
 private ResponseEntity<String> csvResponse(String body,String file){return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename="+file).body(body);} private void validateOffice(OfficeLocation o){if(o.getName()==null||o.getName().isBlank())throw new IllegalArgumentException("Office name is required");if(o.getLatitude()==null||o.getLongitude()==null)throw new IllegalArgumentException("Latitude and longitude are required");if(o.getRadiusMeters()==null||o.getRadiusMeters()<=0)throw new IllegalArgumentException("Radius must be greater than zero");} private String blank(String v){return v==null||v.isBlank()?"":v.trim();} private String csv(Object o){String s=String.valueOf(o==null?"":o).replace("\"","\"\"");return "\""+s+"\"";}
}
''')

# Attendance service rewrite with settings/holiday checks
write('backend/src/main/java/com/ems/service/AttendanceService.java', r'''package com.ems.service;

import com.ems.dto.AttendanceLocationRequest;
import com.ems.model.*;
import com.ems.repository.*;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.List;

@Service
public class AttendanceService {
    private static final double EARTH_RADIUS_METERS=6_371_000.0;
    private final AttendanceRepository attendanceRepository; private final EmployeeRepository employeeRepository; private final OfficeLocationRepository officeLocationRepository; private final LeaveRequestRepository leaveRequestRepository; private final SystemSettingsService settings; private final HolidayService holidays;
    public AttendanceService(AttendanceRepository a,EmployeeRepository e,OfficeLocationRepository o,LeaveRequestRepository l,SystemSettingsService s,HolidayService h){attendanceRepository=a;employeeRepository=e;officeLocationRepository=o;leaveRequestRepository=l;settings=s;holidays=h;}
    private Employee employee(String id){Employee e=employeeRepository.findByEmployeeId(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));if(e.getRole()==Role.SYSTEM_ADMIN)throw new IllegalStateException("Organization Admin accounts do not participate in employee attendance.");return e;}
    public boolean isGeofenceEnabled(){return settings.getBoolean("GEOFENCE_ENABLED",false);} public double getAllowedRadiusMeters(){return settings.getInt("GEOFENCE_RADIUS",100);}
    public Attendance checkIn(String employeeId,AttendanceLocationRequest location){Employee emp=employee(employeeId);ensureAttendanceAvailable();ensureCheckInAvailable();LocalDate today=LocalDate.now();if(holidays.isHoliday(today))throw new IllegalStateException("Today is an organization holiday. Attendance check-in is not required.");Attendance row=attendanceRepository.findByEmployeeAndWorkDate(emp,today).orElse(null);if(row!=null&&row.getCheckInTime()!=null)throw new IllegalStateException("Already checked in today at "+row.getCheckInTime());boolean approvedWfh=isApprovedWorkFromHome(emp,today);LocationVerification v=(isGeofenceEnabled()&&!approvedWfh)?verifyLocation(location):new LocationVerification(0);if(row==null)row=new Attendance();row.setEmployee(emp);row.setWorkDate(today);LocalDateTime now=LocalDateTime.now();row.setCheckInTime(now);if(isGeofenceEnabled()&&!approvedWfh){row.setCheckInLatitude(location.getLatitude());row.setCheckInLongitude(location.getLongitude());row.setCheckInAccuracy(location.getAccuracy());row.setCheckInDistanceMeters(v.distanceMeters());row.setCheckInLocationVerified(true);}LocalTime cutoff=LocalTime.of(9,0).plusMinutes(settings.getInt("LATE_GRACE_MINUTES",10));row.setStatus(approvedWfh?Attendance.AttendanceStatus.WORK_FROM_HOME:(now.toLocalTime().isAfter(cutoff)?Attendance.AttendanceStatus.LATE:Attendance.AttendanceStatus.PRESENT));return attendanceRepository.save(row);}
    public Attendance checkOut(String employeeId,AttendanceLocationRequest location){Employee emp=employee(employeeId);ensureAttendanceAvailable();ensureCheckOutAvailable();Attendance row=attendanceRepository.findByEmployeeAndWorkDate(emp,LocalDate.now()).orElseThrow(()->new IllegalStateException("You must check in before checking out"));if(row.getCheckOutTime()!=null)throw new IllegalStateException("Already checked out today at "+row.getCheckOutTime());boolean approvedWfh=isApprovedWorkFromHome(emp,LocalDate.now());LocationVerification v=(isGeofenceEnabled()&&!approvedWfh)?verifyLocation(location):new LocationVerification(0);LocalDateTime now=LocalDateTime.now();row.setCheckOutTime(now);long mins=Duration.between(row.getCheckInTime(),now).toMinutes();row.setWorkingMinutes(mins);row.setWorkingHours(Math.round(mins/60.0*100.0)/100.0);row.setOvertimeMinutes(Math.max(0,mins-settings.getInt("MIN_WORK_MINUTES",480)));if(!approvedWfh&&mins<240)row.setStatus(Attendance.AttendanceStatus.HALF_DAY);if(isGeofenceEnabled()&&!approvedWfh){row.setCheckOutLatitude(location.getLatitude());row.setCheckOutLongitude(location.getLongitude());row.setCheckOutAccuracy(location.getAccuracy());row.setCheckOutDistanceMeters(v.distanceMeters());row.setCheckOutLocationVerified(true);}return attendanceRepository.save(row);}
    public Attendance markWorkFromHome(String employeeId){employee(employeeId);ensureAttendanceAvailable();throw new IllegalStateException("Work-from-home attendance must follow the approved leave workflow. Use the normal attendance check-in while your approved request is active.");}
    public Attendance markWorkFromHomeCheckout(String employeeId){return checkOut(employeeId,null);}
    private void ensureAttendanceAvailable(){if(!settings.getBoolean("ATTENDANCE_ENABLED",true))throw new IllegalStateException("Attendance has been disabled by your organization administrator.");}
    private void ensureCheckInAvailable(){if(!settings.getBoolean("CHECK_IN_ENABLED",true))throw new IllegalStateException("Check-in is currently disabled by your organization administrator.");}
    private void ensureCheckOutAvailable(){if(!settings.getBoolean("CHECK_OUT_ENABLED",true))throw new IllegalStateException("Check-out is currently disabled by your organization administrator.");}
    private boolean isApprovedWorkFromHome(Employee e,LocalDate d){return leaveRequestRepository.findByEmployeeEmployeeIdOrderByCreatedAtDesc(e.getEmployeeId()).stream().anyMatch(r->r.getStatus()==LeaveStatus.APPROVED&&"WORK_FROM_HOME".equalsIgnoreCase(r.getLeaveType())&&r.getStartDate()!=null&&r.getEndDate()!=null&&!d.isBefore(r.getStartDate())&&!d.isAfter(r.getEndDate()));}
    private LocationVerification verifyLocation(AttendanceLocationRequest l){if(l==null||l.getLatitude()==null||l.getLongitude()==null||l.getAccuracy()==null)throw new IllegalArgumentException("Current location is required for attendance");if(!Double.isFinite(l.getLatitude())||!Double.isFinite(l.getLongitude())||!Double.isFinite(l.getAccuracy()))throw new IllegalArgumentException("Invalid location data");double maxAcc=settings.getInt("MAX_GPS_ACCURACY",100);if(l.getAccuracy()>maxAcc)throw new IllegalArgumentException("GPS accuracy is too low ("+Math.round(l.getAccuracy())+"m)");List<OfficeLocation> offices=officeLocationRepository.findByActiveTrue();double nearest=Double.MAX_VALUE;for(OfficeLocation o:offices){if(o.getLatitude()==null||o.getLongitude()==null)continue;double d=distance(l.getLatitude(),l.getLongitude(),o.getLatitude(),o.getLongitude());nearest=Math.min(nearest,d);if(d<=(o.getRadiusMeters()==null?getAllowedRadiusMeters():o.getRadiusMeters()))return new LocationVerification(d);}if(nearest<Double.MAX_VALUE)throw new IllegalArgumentException("You are outside all active office geofences. Nearest office: "+Math.round(nearest)+"m");throw new IllegalArgumentException("No active office geofence is configured.");}
    private double distance(double a,double b,double c,double d){double dl=Math.toRadians(c-a),dn=Math.toRadians(d-b);double x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(Math.toRadians(a))*Math.cos(Math.toRadians(c))*Math.sin(dn/2)*Math.sin(dn/2);return EARTH_RADIUS_METERS*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
    private record LocationVerification(double distanceMeters){}
    public List<Attendance> getMyHistory(String id){return attendanceRepository.findByEmployeeOrderByWorkDateDesc(employee(id));}
    public Attendance getMyToday(String id){return attendanceRepository.findByEmployeeAndWorkDate(employee(id),LocalDate.now()).orElse(null);}
    public List<Attendance> getAllAttendance(){return attendanceRepository.findAllByOrderByWorkDateDescCheckInTimeDesc();}
    public List<Attendance> getTodayAttendance(){return attendanceRepository.findByWorkDateOrderByCheckInTimeDesc(LocalDate.now());}
}
''')

# Leave controller integrate working day calculation
p=root/'backend/src/main/java/com/ems/controller/LeaveController.java'; s=p.read_text()
s=s.replace('    private final AuditService audit;','    private final AuditService audit;\n    private final com.ems.service.HolidayService holidays;')
s=s.replace('                    NotificationService n, AuditService a){','                    NotificationService n, AuditService a, com.ems.service.HolidayService h){')
s=s.replace('        leaves=l; employees=e; departments=d; notifications=n; audit=a;','        leaves=l; employees=e; departments=d; notifications=n; audit=a; holidays=h;')
s=s.replace('        r.setEmployee(e);','        if(holidays.countWorkingDays(r.getStartDate(), r.getEndDate()) <= 0) throw new IllegalArgumentException("The selected leave range contains no organization working days");\n\n        r.setEmployee(e);')
p.write_text(s)

# Migration V10
write('backend/src/main/resources/db/migration/V10__settings_holidays_security.sql', r'''ALTER TABLE employees ADD COLUMN IF NOT EXISTS login_failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS organization_holidays (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  holiday_date DATE NOT NULL UNIQUE,
  description VARCHAR(1000),
  type VARCHAR(50) NOT NULL DEFAULT 'PUBLIC',
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_org_holiday_date ON organization_holidays(holiday_date);

INSERT INTO system_settings(setting_key, setting_value, description)
VALUES
('ATTENDANCE_ENABLED','true','Organization attendance availability'),
('CHECK_IN_ENABLED','true','Employee check-in availability'),
('CHECK_OUT_ENABLED','true','Employee check-out availability'),
('GEOFENCE_ENABLED','false','Whether attendance location verification is enabled'),
('GEOFENCE_RADIUS','100','Default geofence radius in meters'),
('LATE_GRACE_MINUTES','10','Late grace period in minutes'),
('MIN_WORK_MINUTES','480','Minimum work duration in minutes'),
('MAX_GPS_ACCURACY','100','Maximum accepted GPS accuracy in meters'),
('MAX_LOGIN_ATTEMPTS','5','Failed attempts before temporary lock'),
('ACCOUNT_LOCK_MINUTES','15','Temporary account lock duration in minutes'),
('SESSION_TIMEOUT_MINUTES','30','JWT session timeout in minutes'),
('MAINTENANCE_MODE','false','Restrict normal application access while allowing Organization Admins'),
('EMPLOYEE_LOGIN_ENABLED','true','Employee login access'),
('MANAGER_LOGIN_ENABLED','true','Manager login access'),
('HR_ADMIN_LOGIN_ENABLED','true','HR Admin login access'),
('TIMEZONE','Asia/Kolkata','Organization timezone'),
('WORKING_DAYS','MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY','Comma separated working days')
ON CONFLICT (setting_key) DO NOTHING;
''')

# Frontend API additions
p=root/'frontend/src/api/api.jsx'; s=p.read_text()
s=s.replace('  systemSettings: () => get("/system-admin/settings"),','  systemSettings: () => get("/system-admin/settings"),\n  adminAccessMe: () => get("/admin/access/me"),\n  holidays: (year, includeInactive=false) => get(`/admin/holidays?year=${year}&includeInactive=${includeInactive}`),\n  createHoliday: (payload) => post("/admin/holidays", payload),\n  updateHoliday: (id,payload) => put(`/admin/holidays/${id}`, payload),\n  setHolidayActive: (id,active) => patch(`/admin/holidays/${id}/status`, {active}),\n  deleteHoliday: (id) => del(`/admin/holidays/${id}`),')
p.write_text(s)

# Frontend SystemAdminPanel: preserve organization, replace Settings component and add Holiday component dispatch
p=root/'frontend/src/components/SystemAdminPanel.jsx'; s=p.read_text()
s=s.replace(" if(section==='organization')return <Organization reload={load}/>; if(section==='settings')return <Settings section={section} settings={settings} setSettings={setSettings} save={saveSettings}/>;", " if(section==='organization')return <Organization reload={load}/>; if(section==='settings')return <Settings section={section} settings={settings} setSettings={setSettings} save={saveSettings}/>; if(section==='holidays')return <HolidayCalendar/>;")
start=s.index('function Settings(')
end=s.index('\nfunction Organization', start)
new_settings=r'''function Settings({section,settings,setSettings,save}){
 const boolKeys=['ATTENDANCE_ENABLED','CHECK_IN_ENABLED','CHECK_OUT_ENABLED','GEOFENCE_ENABLED','MAINTENANCE_MODE','EMPLOYEE_LOGIN_ENABLED','MANAGER_LOGIN_ENABLED','HR_ADMIN_LOGIN_ENABLED'];
 const numberMeta={GEOFENCE_RADIUS:['Geofence radius','meters',1,50000],MAX_GPS_ACCURACY:['Maximum GPS accuracy','meters',1,5000],LATE_GRACE_MINUTES:['Late grace period','minutes',0,1440],MIN_WORK_MINUTES:['Minimum work duration','minutes',0,1440],MAX_LOGIN_ATTEMPTS:['Maximum login attempts','attempts',1,20],ACCOUNT_LOCK_MINUTES:['Account lock duration','minutes',1,1440],SESSION_TIMEOUT_MINUTES:['Session timeout','minutes',5,1440]};
 const [message,setMessage]=useState(''); const [saving,setSaving]=useState(false);
 const set=(k,v)=>setSettings({...settings,[k]:v});
 const doSave=async()=>{setSaving(true);setMessage('');try{await save();setMessage('Changes saved successfully.')}catch(e){setMessage(e.message)}finally{setSaving(false)}};
 return <div className="sys-page"><div className="sys-hero"><div><span>CONFIGURATION</span><h2>System Settings</h2><p>Organization-wide policies are stored centrally and enforced by the backend.</p></div><button className="primary-btn" onClick={doSave} disabled={saving}>{saving?'Saving…':'Save Changes'}</button></div>{message&&<div className={message.includes('success')?'success-banner':'error-banner'}>{message}</div>}
   <div className="settings-card-group"><div className="settings-card"><h3>Attendance</h3><p className="muted">Control whether attendance and location rules are available.</p>{[['ATTENDANCE_ENABLED','Attendance enabled'],['CHECK_IN_ENABLED','Check-in enabled'],['CHECK_OUT_ENABLED','Check-out enabled'],['GEOFENCE_ENABLED','Geofence enabled']].map(([k,label])=><ToggleRow key={k} label={label} checked={!!settings[k]} onChange={v=>set(k,v)}/>) }<div className="settings-field-grid">{Object.entries(numberMeta).slice(0,4).map(([k,m])=><NumberField key={k} label={m[0]} unit={m[1]} min={m[2]} max={m[3]} value={settings[k]??''} onChange={v=>set(k,Number(v))}/>)}</div></div>
   <div className="settings-card"><h3>Security</h3><p className="muted">Authentication policy and session controls.</p><div className="settings-field-grid">{Object.entries(numberMeta).slice(4).map(([k,m])=><NumberField key={k} label={m[0]} unit={m[1]} min={m[2]} max={m[3]} value={settings[k]??''} onChange={v=>set(k,Number(v))}/>)}</div></div>
   <div className="settings-card"><h3>Login Access</h3><p className="muted">Control login by account category. Organization Admin login is always protected.</p><ToggleRow label="Employee login" checked={!!settings.EMPLOYEE_LOGIN_ENABLED} onChange={v=>set('EMPLOYEE_LOGIN_ENABLED',v)}/><ToggleRow label="Manager login" checked={!!settings.MANAGER_LOGIN_ENABLED} onChange={v=>set('MANAGER_LOGIN_ENABLED',v)}/><ToggleRow label="HR Admin login" checked={!!settings.HR_ADMIN_LOGIN_ENABLED} onChange={v=>set('HR_ADMIN_LOGIN_ENABLED',v)}/><div className="protected-row"><span><b>Organization Admin login</b><small>Protected to prevent administrator lockout</small></span><span className="status-badge">PROTECTED</span></div></div>
   <div className="settings-card"><h3>System</h3><p className="muted">Temporarily restrict normal users during maintenance.</p><ToggleRow label="Maintenance mode" checked={!!settings.MAINTENANCE_MODE} onChange={v=>set('MAINTENANCE_MODE',v)}/><label className="settings-text-field"><span>Timezone</span><select value={settings.TIMEZONE||'Asia/Kolkata'} onChange={e=>set('TIMEZONE',e.target.value)}><option>Asia/Kolkata</option><option>UTC</option><option>Asia/Singapore</option><option>Europe/London</option><option>America/New_York</option></select></label></div></div></div>
}
function ToggleRow({label,checked,onChange}){return <div className="toggle-row"><div><b>{label}</b><small>{checked?'Enabled':'Disabled'}</small></div><button type="button" className={`switch ${checked?'on':''}`} onClick={()=>onChange(!checked)} aria-pressed={checked}><span/></button></div>}
function NumberField({label,unit,min,max,value,onChange}){return <label className="settings-number"><span>{label}</span><div><input type="number" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/><em>{unit}</em></div></label>}
function HolidayCalendar(){
 const yearNow=new Date().getFullYear(); const [year,setYear]=useState(yearNow); const [items,setItems]=useState([]); const [error,setError]=useState(''); const [editing,setEditing]=useState(null); const blank={name:'',holidayDate:'',description:'',type:'PUBLIC',recurring:false,active:true}; const [form,setForm]=useState(blank);
 const load=()=>api.holidays(year,true).then(setItems).catch(e=>setError(e.message)); useEffect(()=>{load()},[year]);
 const save=async e=>{e.preventDefault();setError('');try{if(editing)await api.updateHoliday(editing,form);else await api.createHoliday(form);setEditing(null);setForm(blank);load()}catch(e){setError(e.message)}};
 const edit=h=>{setEditing(h.id);setForm({name:h.name,holidayDate:h.holidayDate,description:h.description||'',type:h.type||'PUBLIC',recurring:!!h.recurring,active:!!h.active})};
 return <div className="sys-page"><div className="sys-hero"><div><span>ORGANIZATION CALENDAR</span><h2>Holiday Calendar</h2><p>Active holidays are used by working-day and leave calculations.</p></div><div className="holiday-toolbar"><select value={year} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:7},(_,i)=>yearNow-2+i).map(y=><option key={y}>{y}</option>)}</select><button className="primary-btn" onClick={()=>{setEditing(null);setForm({...blank,holidayDate:`${year}-01-01`})}}>+ Add Holiday</button></div></div>{error&&<div className="error-banner">{error}</div>}
 <div className="holiday-layout"><div className="sys-card"><h3>{year} holidays</h3><div className="holiday-list">{items.map(h=><div className="holiday-item" key={h.id}><div><b>{new Date(h.holidayDate+'T00:00:00').toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'})}</b><strong>{h.name}</strong><small>{h.type} · {h.active?'Active':'Inactive'}{h.recurring?' · Recurring':''}</small>{h.description&&<p>{h.description}</p>}</div><div className="holiday-actions"><button className="secondary-btn" onClick={()=>edit(h)}>Edit</button><button className="secondary-btn" onClick={async()=>{try{await api.setHolidayActive(h.id,!h.active);load()}catch(e){setError(e.message)}}}>{h.active?'Disable':'Enable'}</button><button className="btn btn-danger btn-sm" onClick={async()=>{if(!window.confirm(`Delete ${h.name}?`))return;try{await api.deleteHoliday(h.id);load()}catch(e){setError(e.message)}}}>Delete</button></div></div>)}{!items.length&&<div className="empty-state">No holidays configured for {year}. Add the organization holidays that should be excluded from working-day calculations.</div>}</div></div>
 <form className="sys-card holiday-form" onSubmit={save}><h3>{editing?'Edit Holiday':'Add Holiday'}</h3><label><span>Holiday name</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label><span>Date</span><input required type="date" value={form.holidayDate} onChange={e=>setForm({...form,holidayDate:e.target.value})}/></label><label><span>Type</span><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>PUBLIC</option><option>ORGANIZATION</option><option>OPTIONAL</option></select></label><label><span>Description</span><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label className="check-row"><input type="checkbox" checked={form.recurring} onChange={e=>setForm({...form,recurring:e.target.checked})}/><span>Recurring holiday</span></label><label className="check-row"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/><span>Active</span></label><div style={{display:'flex',gap:8}}><button className="primary-btn" type="submit">{editing?'Update Holiday':'Create Holiday'}</button>{editing&&<button type="button" className="secondary-btn" onClick={()=>{setEditing(null);setForm(blank)}}>Cancel</button>}</div></form></div></div>
}'''
s=s[:start]+new_settings+s[end:]
p.write_text(s)

# Frontend Admin Dashboard dynamic permissions
write('frontend/src/components/AdminDashboard.jsx', r'''import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import EmployeeList from "./EmployeeList"; import AttendanceTable from "./AttendanceTable"; import Announcements from "./Announcements"; import Tasks from "./Tasks"; import Inventory from "./Inventory"; import LeaveManagement from "./LeaveManagement"; import Notifications from "./Notifications"; import DamageReports from "./DamageReports"; import OfficeLocations from "./OfficeLocations"; import Reports from "./Reports"; import SystemAdminPanel from "./SystemAdminPanel"; import api from "../api/api";
const MODULES=[
 {key:"people",permission:"PEOPLE",label:"Employees",component:<EmployeeList/>},
 {key:"attendance",permission:"ATTENDANCE",label:"Attendance Management",component:<AttendanceTable/>},
 {key:"announcements",permission:"COMMUNICATION",label:"Announcements",component:<Announcements adminMode/>},
 {key:"tasks",permission:"TASKS",label:"Tasks",component:<Tasks adminMode/>},
 {key:"inventory",permission:"INVENTORY",label:"Inventory",component:<Inventory/>},
 {key:"leave",permission:"LEAVE",label:"Leave Requests",component:<LeaveManagement adminMode/>},
 {key:"offices",permission:"OFFICE",label:"Office Locations",component:<OfficeLocations/>},
 {key:"damage",permission:"PEOPLE",label:"Damage Reports",component:<DamageReports adminMode/>},
 {key:"reports",permission:"REPORTS",label:"Reports",component:<Reports/>},
 {key:"holidays",permission:"HOLIDAY_CALENDAR",label:"Holiday Calendar",component:<SystemAdminPanel section="holidays"/>},
];
export default function AdminDashboard(){
 const {user,logout}=useAuth(); const navigate=useNavigate(); const system=user?.role==="SYSTEM_ADMIN"; const [tab,setTab]=useState(system?"system":"dashboard"); const [permissions,setPermissions]=useState(system?["ALL"]:[]); const [loadingAccess,setLoadingAccess]=useState(!system); const [accessError,setAccessError]=useState(""); const [notificationCount,setNotificationCount]=useState(0);
 useEffect(()=>{if(system)return;let alive=true;api.adminAccessMe().then(x=>{if(alive)setPermissions(x?.permissions||[])}).catch(e=>alive&&setAccessError(e.message)).finally(()=>alive&&setLoadingAccess(false));return()=>{alive=false}},[system]);
 const has=key=>system||permissions.includes("ALL")||permissions.includes(key); const allowed=useMemo(()=>MODULES.filter(m=>has(m.permission)),[permissions,system]);
 useEffect(()=>{api.unreadCount().then(r=>setNotificationCount(r?.count||0)).catch(()=>{})},[]);
 const logoutNow=()=>{logout();navigate("/login")};
 const commonTop=<><button className="tab-btn" onClick={()=>navigate("/employee")}>My Attendance & Work</button><button className={`tab-btn ${tab==="notifications"?"active":""}`} onClick={()=>setTab("notifications")}>{`Notifications${notificationCount?` (${notificationCount})`:""}`}</button></>;
 return <div className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark"/> OrbitDesk <span style={{opacity:.6,fontWeight:500,fontSize:".8rem"}}>· {system?"Organization Admin":"HR Admin"}</span></div><div className="topbar-right"><div className="who"><div className="name">{user.name}</div><div className="role">{user.employeeId}</div></div><button className="btn-logout" onClick={logoutNow}>Log out</button></div></header>
 <main className="page"><div className="workspace-intro"><div><div className="workspace-kicker">{system?"ORGANIZATION ADMIN WORKSPACE":"DELEGATED ADMIN WORKSPACE"}</div><h1>{system?"Organization Control Center":"HR Operations Workspace"}</h1><p>{system?"Control organization policy, people, managers, security, configuration and governance from one place.":"Your workspace is built from the modules assigned by your Organization Admin."}</p></div></div>
 {system?<><div className="tabs system-tabs"><button className={`tab-btn ${tab==="system"?"active":""}`} onClick={()=>setTab("system")}>Control Center</button><button className={`tab-btn ${tab==="employees"?"active":""}`} onClick={()=>setTab("employees")}>HR Admins</button><button className={`tab-btn ${tab==="offices"?"active":""}`} onClick={()=>setTab("offices")}>Offices & Geofences</button><button className={`tab-btn ${tab==="organization"?"active":""}`} onClick={()=>setTab("organization")}>Organization</button><button className={`tab-btn ${tab==="security"?"active":""}`} onClick={()=>setTab("security")}>Security Center</button><button className={`tab-btn ${tab==="audit"?"active":""}`} onClick={()=>setTab("audit")}>Audit Logs</button><button className={`tab-btn ${tab==="settings"?"active":""}`} onClick={()=>setTab("settings")}>Configuration</button><button className={`tab-btn ${tab==="holidays"?"active":""}`} onClick={()=>setTab("holidays")}>Holiday Calendar</button><button className={`tab-btn ${tab==="health"?"active":""}`} onClick={()=>setTab("health")}>System Health</button>{commonTop}</div>{tab==="system"&&<SystemAdminPanel section="control"/>}{tab==="employees"&&<EmployeeList/>}{tab==="offices"&&<SystemAdminPanel section="offices"/>}{tab==="organization"&&<SystemAdminPanel section="organization"/>}{tab==="security"&&<SystemAdminPanel section="security"/>}{tab==="audit"&&<SystemAdminPanel section="audit"/>}{tab==="settings"&&<SystemAdminPanel section="settings"/>}{tab==="holidays"&&<SystemAdminPanel section="holidays"/>}{tab==="health"&&<SystemAdminPanel section="health"/>}{tab==="notifications"&&<Notifications onCount={setNotificationCount}/>}</>
 :loadingAccess?<div className="card">Loading your delegated access…</div>:<>{accessError&&<div className="error-banner">Unable to load delegated access: {accessError}</div>}<div className="tabs">{<button className={`tab-btn ${tab==="dashboard"?"active":""}`} onClick={()=>setTab("dashboard")}>Dashboard</button>}{allowed.map(m=><button key={m.key} className={`tab-btn ${tab===m.key?"active":""}`} onClick={()=>setTab(m.key)}>{m.label}</button>)}{commonTop}</div>{tab==="dashboard"&&<DelegatedHome permissions={permissions} modules={allowed}/>} {allowed.map(m=>tab===m.key?<React.Fragment key={m.key}>{m.component}</React.Fragment>:null)}{tab==="notifications"&&<Notifications onCount={setNotificationCount}/>}</>}</main></div>
}
function DelegatedHome({permissions,modules}){return <div className="access-home"><div className="sys-grid"><div className="sys-stat"><span>Assigned modules</span><b>{modules.length}</b></div><div className="sys-stat"><span>Access level</span><b>{permissions.includes("ALL")?"Full":"Delegated"}</b></div><div className="sys-stat"><span>Security</span><b>Backend enforced</b></div><div className="sys-stat"><span>Notifications</span><b>Self-service</b></div></div><div className="sys-card"><h3>Your available workspace</h3><p className="muted">Only modules granted by your Organization Admin are shown here. Direct API access is protected independently by the server.</p><div className="module-cards">{modules.map(m=><div className="module-card" key={m.key}><b>{m.label}</b><span>Available</span><button className="secondary-btn" onClick={()=>document.querySelector(`[data-module="${m.key}"]`)?.click?.()}>Open</button></div>)}{!modules.length&&<div className="empty-state">Your administrator has not assigned additional modules to your account.</div>}</div></div></div>}
''')

# Add CSS for new settings/holiday/home widgets
append('frontend/src/App.css', r'''
/* Enterprise configuration + holiday calendar */
.settings-card-group{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.settings-card{background:#fff;border:1px solid #e8edf3;border-radius:16px;padding:20px;box-shadow:0 8px 28px rgba(16,24,40,.04)}
.settings-card h3{margin:0 0 6px}.settings-card>.muted{margin-top:0;margin-bottom:16px}
.toggle-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 0;border-bottom:1px solid #eef1f4}.toggle-row:last-of-type{border-bottom:0}.toggle-row small,.protected-row small{display:block;color:#667085;margin-top:3px}
.switch{width:48px;height:28px;border:0;border-radius:999px;background:#d0d5dd;padding:3px;cursor:pointer;transition:.15s}.switch span{display:block;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);transition:.15s}.switch.on{background:#1f5eff}.switch.on span{transform:translateX(20px)}
.settings-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.settings-number,.settings-text-field{display:flex;flex-direction:column;gap:6px;font-size:.78rem;font-weight:700;color:#475467}.settings-number>div{display:flex;align-items:center;gap:8px}.settings-number input,.settings-text-field select{width:100%;padding:11px;border:1px solid #d7dde5;border-radius:9px;background:#fff}.settings-number em{font-style:normal;color:#667085;min-width:64px}.protected-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;margin-top:8px;border-top:1px solid #eef1f4}.status-badge{font-size:.7rem;font-weight:800;letter-spacing:.06em;background:#eef4ff;color:#365ad8;border-radius:999px;padding:6px 9px}.holiday-toolbar{display:flex;gap:8px}.holiday-toolbar select{padding:10px 12px;border:1px solid #d7dde5;border-radius:9px;background:#fff;font-weight:700}.holiday-layout{display:grid;grid-template-columns:1.7fr 1fr;gap:16px}.holiday-list{display:flex;flex-direction:column}.holiday-item{display:flex;justify-content:space-between;gap:16px;padding:15px 0;border-bottom:1px solid #eef1f4}.holiday-item:last-child{border-bottom:0}.holiday-item b{display:block;color:#1f5eff;font-size:.8rem}.holiday-item strong{display:block;margin-top:3px}.holiday-item small{display:block;color:#667085;margin-top:4px}.holiday-item p{margin:6px 0 0;color:#667085;font-size:.85rem}.holiday-actions{display:flex;gap:7px;align-items:flex-start;flex-wrap:wrap}.holiday-form{display:flex;flex-direction:column;gap:12px}.holiday-form label{display:flex;flex-direction:column;gap:6px;font-size:.78rem;font-weight:700;color:#475467}.holiday-form input,.holiday-form select,.holiday-form textarea{padding:11px;border:1px solid #d7dde5;border-radius:9px;background:#fff}.holiday-form textarea{min-height:90px;resize:vertical}.check-row{flex-direction:row!important;align-items:center}.check-row input{width:auto}.empty-state{padding:24px;text-align:center;color:#667085;border:1px dashed #d7dde5;border-radius:12px;background:#fafbfc}.access-home{display:flex;flex-direction:column;gap:16px}.module-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.module-card{border:1px solid #e8edf3;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;background:#fbfcfe}.module-card span{font-size:.76rem;color:#667085}.module-card .secondary-btn{align-self:flex-start}
@media(max-width:900px){.settings-card-group,.holiday-layout{grid-template-columns:1fr}.module-cards{grid-template-columns:1fr 1fr}.settings-field-grid{grid-template-columns:1fr}}
@media(max-width:560px){.module-cards{grid-template-columns:1fr}.holiday-toolbar{width:100%;flex-wrap:wrap}.holiday-toolbar select{flex:1}}
''')

# Login frontend display meaningful backend errors already uses err.message, ensure 503/423 not masked; no change needed.
print('PATCHED')
