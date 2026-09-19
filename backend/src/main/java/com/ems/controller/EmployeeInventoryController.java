package com.ems.controller;
import com.ems.service.EmployeeInventoryService; 
import org.springframework.security.core.Authentication; 
import org.springframework.web.bind.annotation.*; 
import java.util.*;
@RestController @RequestMapping("/api/inventory") 
public class EmployeeInventoryController { 
    private final EmployeeInventoryService s; 
    public EmployeeInventoryController(EmployeeInventoryService s){
        this.s=s;
    } 
    @GetMapping("/available") 
    public List<Map<String,Object>> available(){
        return s.available();
    } 
    @PostMapping("/requests") 
    public Map<String,Object> request(@RequestBody Map<String,Object>b,Authentication a){
        return s.request(a.getName(),b);
    } 
    @GetMapping("/requests/me") 
    public List<Map<String,Object>> myRequests(Authentication a){
        return s.myRequests(a.getName());
    } 
    @GetMapping("/my-items") 
    public List<Map<String,Object>> myItems(Authentication a){
        return s.myInventory(a.getName());
    } 
    @PostMapping("/usage") 
    public Map<String,Object> usage(@RequestBody Map<String,Object>b,Authentication a){
        return s.usage(a.getName(),b);
    } 
    @GetMapping("/usage/me") 
    public List<Map<String,Object>> myUsage(Authentication a){
        return s.myUsage(a.getName());
    }
}
