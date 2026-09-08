package com.ems.controller;
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
