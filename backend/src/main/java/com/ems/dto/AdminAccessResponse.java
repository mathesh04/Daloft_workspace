package com.ems.dto;
import com.ems.model.AdminAccess;
public record AdminAccessResponse(Long id,String permission,String scopeType,String scopeValue,boolean active){
    public AdminAccessResponse(AdminAccess a){
        this(a.getId(),a.getPermission(),a.getScopeType(),a.getScopeValue(),a.isActive());
    }
}
