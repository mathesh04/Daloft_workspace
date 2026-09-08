package com.ems.controller;
import com.ems.dto.EmployeeRequest; import com.ems.dto.EmployeeResponse; import com.ems.service.EmployeeService;
import jakarta.validation.Valid; import org.springframework.http.ResponseEntity; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/system-admin/users")
public class SystemAdminEmployeeController {
 private final EmployeeService employees; public SystemAdminEmployeeController(EmployeeService e){employees=e;}
 @GetMapping public List<EmployeeResponse> list(){return employees.getHrAdminsForSystemAdmin();}
 @PostMapping public ResponseEntity<?> create(@Valid @RequestBody EmployeeRequest r){try{return ResponseEntity.ok(employees.createHrAdmin(r));}catch(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}}
 @PutMapping("/{id}") public ResponseEntity<?> update(@PathVariable Long id,@Valid @RequestBody EmployeeRequest r){try{return ResponseEntity.ok(employees.updateHrAdmin(id,r));}catch(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}}
 @PatchMapping("/{id}/status") public ResponseEntity<?> status(@PathVariable Long id,@RequestBody Map<String,Boolean> b){try{employees.setHrAdminActive(id,Boolean.TRUE.equals(b.get("active")));return ResponseEntity.ok(Map.of("message","HR_ADMIN status updated"));}catch(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}}
}