package com.ems.service;

import com.ems.model.Employee;
import com.ems.model.Role;
import com.ems.repository.AdminAccessRepository;
import com.ems.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminAccessService {
    private final AdminAccessRepository repo;
    private final EmployeeRepository employees;

    public AdminAccessService(AdminAccessRepository r, EmployeeRepository e){repo=r;employees=e;}

    public List<String> permissions(String employeeId){
        Employee e=employees.findByEmployeeId(employeeId).orElse(null);
        if(e==null || e.getRole()!=Role.ADMIN) return List.of("ALL");
        return repo.findByEmployeeOrderByPermissionAsc(e).stream()
                .filter(a->a.isActive() && "ORGANIZATION".equalsIgnoreCase(a.getScopeType()))
                .map(a->a.getPermission().toUpperCase(Locale.ROOT)).distinct().sorted().collect(Collectors.toList());
    }

    public boolean allowed(String employeeId,String permission){
        Employee e=employees.findByEmployeeId(employeeId).orElse(null);
        if(e==null || e.getRole()!=Role.ADMIN) return true;
        String p=permission==null?"":permission.trim().toUpperCase(Locale.ROOT);
        return repo.findByEmployeeOrderByPermissionAsc(e).stream()
                .filter(a->a.isActive() && "ORGANIZATION".equalsIgnoreCase(a.getScopeType()))
                .anyMatch(a->"ALL".equalsIgnoreCase(a.getPermission()) || p.equalsIgnoreCase(a.getPermission()));
    }
}
