package com.ems.controller;
import com.ems.service.EmployeeInventoryService; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.*;
@RestController @RequestMapping("/api/admin/inventory")
public class AdminInventoryWorkflowController {
 private final EmployeeInventoryService s;
 public AdminInventoryWorkflowController(EmployeeInventoryService s){this.s=s;}
 @GetMapping("/requests") public List<Map<String,Object>> requests(){return s.allRequests();}
 @PostMapping("/requests/{id}/review") public Map<String,Object> review(@PathVariable Long id,@RequestBody Map<String,Object>b,Authentication a){return s.review(id,b,a.getName());}
 @GetMapping("/usage-updates") public List<Map<String,Object>> usage(){return s.allUsage();}
 @PostMapping("/usage-updates/{id}/review") public Map<String,Object> reviewUsage(@PathVariable Long id,@RequestBody Map<String,Object>b,Authentication a){return s.reviewUsage(id,b,a.getName());}
}
