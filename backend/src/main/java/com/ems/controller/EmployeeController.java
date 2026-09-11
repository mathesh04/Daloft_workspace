package com.ems.controller;
import com.ems.dto.EmployeeRequest; import com.ems.dto.EmployeeResponse; import com.ems.service.EmployeeService;
import jakarta.validation.Valid; import org.springframework.http.ResponseEntity; import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/admin/employees")
public class EmployeeController {
 private final EmployeeService employeeService; public EmployeeController(EmployeeService s){
    employeeService=s;
}
    @GetMapping public List<EmployeeResponse> getAll(){
        return employeeService.getEmployeesForHrAdmin();
    }
 @GetMapping("/departments") 
 public List<com.ems.dto.DepartmentOption> departments(){
    return employeeService.getActiveDepartmentsForHr();
}
 @PostMapping 
    public ResponseEntity<?> create(@Valid @RequestBody EmployeeRequest r){
        try{
            return ResponseEntity.ok(employeeService.createEmployee(r));
        }
        catch(IllegalArgumentException e){
            return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));
        }
    }
 @PutMapping("/{id}") 
 public ResponseEntity<?> update(@PathVariable Long id,@Valid @RequestBody EmployeeRequest r){
    try{
        return ResponseEntity.ok(employeeService.updateEmployee(id,r));
    }
    catch(IllegalArgumentException e){
        return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));
    }
}
 @PatchMapping("/{id}/status") 
 public ResponseEntity<?> status(@PathVariable Long id,@RequestBody Map<String,Boolean> b){
    try{
        employeeService.setEmployeeActive(id,Boolean.TRUE.equals(b.get("active")));
        return ResponseEntity.ok(Map.of("message","Employee status updated"));
    }
    catch(IllegalArgumentException e){
        return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));
    }
}
 @DeleteMapping("/{id}") 
 public ResponseEntity<?> archive(@PathVariable Long id){
    try{
        employeeService.archiveEmployee(id);
        return ResponseEntity.ok(Map.of("message","Employee archived. Historical attendance, leave and inventory records were preserved."));
    }
    catch(IllegalArgumentException e){
        return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));
    }
}
}