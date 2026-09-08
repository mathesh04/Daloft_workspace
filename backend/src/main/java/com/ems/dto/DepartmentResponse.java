package com.ems.dto;
import com.ems.model.Department;
public record DepartmentResponse(Long id,String name,String code,Long managerId,String managerName,boolean active){
    public DepartmentResponse(Department d){
        this(d.getId(),d.getName(),d.getCode(),d.getManager()==null?null:d.getManager().getId(),d.getManager()==null?null:d.getManager().getName(),d.isActive());
    }
}
