package com.ems.controller; 
import com.ems.dto.EmployeeResponse; 
import com.ems.model.Employee; 
import com.ems.repository.EmployeeRepository; 
import org.springframework.http.*; 
import org.springframework.security.core.Authentication; 
import org.springframework.web.bind.annotation.*; 
import java.util.*;
@RestController 
@RequestMapping("/api/profile") 
public class ProfileController { 
    private final EmployeeRepository repo; 
    public ProfileController(EmployeeRepository r){
        repo=r;
    } 
    private Employee me(Authentication a){
        return repo.findByEmployeeId(a.getName()).orElseThrow(()->new IllegalArgumentException("Employee not found"));
    }
 @GetMapping("/me") 
 public EmployeeResponse get(Authentication a){
    return new EmployeeResponse(me(a));
}
 @PutMapping("/me") 
 public ResponseEntity<?> update(Authentication a,@RequestBody Map<String,String> b){
    Employee e=me(a);
    e.setPhoneNumber(b.get("phoneNumber"));
    e.setAddress(b.get("address"));
    e.setEmergencyContact(b.get("emergencyContact"));
    e.setProfilePictureUrl(b.get("profilePictureUrl"));
    if(b.get("email")!=null&&!b.get("email").isBlank())e.setEmail(b.get("email"));
    return ResponseEntity.ok(new EmployeeResponse(repo.save(e)));
}
}