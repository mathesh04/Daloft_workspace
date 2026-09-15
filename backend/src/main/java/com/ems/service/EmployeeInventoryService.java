package com.ems.service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.model.AuditLog;
import com.ems.model.Component;
import com.ems.model.Employee;
import com.ems.model.InventoryRequest;
import com.ems.model.InventoryUsageUpdate;
import com.ems.model.RequestStatus;
import com.ems.model.StockTransaction;
import com.ems.model.TransactionType;
import com.ems.model.UsageStatus;
import com.ems.repository.AuditLogRepository;
import com.ems.repository.ComponentRepository;
import com.ems.repository.EmployeeRepository;
import com.ems.repository.InventoryRequestRepository;
import com.ems.repository.InventoryUsageUpdateRepository;
import com.ems.repository.StockTransactionRepository;

@Service
public class EmployeeInventoryService {
    private final ComponentRepository components;
    private final EmployeeRepository employees;
    private final InventoryRequestRepository requests;
    private final InventoryUsageUpdateRepository updates;
    private final StockTransactionRepository transactions;
    private final AuditLogRepository audit;
    private final NotificationService notifications;

    public EmployeeInventoryService(ComponentRepository c,EmployeeRepository e,InventoryRequestRepository r,InventoryUsageUpdateRepository u,StockTransactionRepository t,AuditLogRepository a,NotificationService n){
        components=c; employees=e; requests=r; updates=u; transactions=t; audit=a; notifications=n;
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> available(){return components.findAllByOrderByNameAsc().stream().map(this::componentDto).toList();}

    @Transactional
    public Map<String,Object> request(String user,Map<String,Object>b){
        Component c=component(num(b.get("componentId"))); int q=qty(b.get("quantity"));
        if(c.getCurrentQuantity()<q) throw new IllegalArgumentException("Only "+c.getCurrentQuantity()+" available");
        InventoryRequest r=new InventoryRequest(); r.setComponent(c); r.setEmployee(employee(user)); r.setQuantity(q); r.setPurpose(text(b.get("purpose")));
        requests.save(r);
        notifications.notifyAdmins("Inventory request pending", employee(user).getName()+" requested "+q+" "+c.getUnit()+" of "+c.getName()+".","INVENTORY");
        log(user,"REQUEST_ITEM","Requested "+q+" "+c.getUnit()+" of "+c.getName()); return requestDto(r);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> myRequests(String user){return requests.findByEmployeeEmployeeIdOrderByRequestedAtDesc(user).stream().map(this::requestDto).toList();}

    @Transactional(readOnly = true)
    public List<Map<String,Object>> allRequests(){return requests.findAllByOrderByRequestedAtDesc().stream().map(this::requestDto).toList();}

    @Transactional
    public Map<String,Object> review(Long id,Map<String,Object>b,String admin){
        InventoryRequest r=requests.findById(id).orElseThrow(()->new IllegalArgumentException("Request not found"));
        if(r.getStatus()!=RequestStatus.PENDING) throw new IllegalArgumentException("Request already reviewed");
        boolean approve=Boolean.TRUE.equals(b.get("approved")); r.setAdminRemark(text(b.get("remark"))); r.setReviewedAt(LocalDateTime.now()); r.setReviewedBy(admin);
        if(!approve){r.setStatus(RequestStatus.REJECTED); InventoryRequest saved=requests.save(r); notifications.create(r.getEmployee(),"Inventory request rejected","Your inventory request #"+id+" was rejected." ,"INVENTORY",false); log(admin,"REJECT_REQUEST","Rejected request #"+id); return requestDto(saved);}
        Component c=components.findWithLockById(r.getComponent().getId()).orElseThrow(()->new IllegalArgumentException("Component not found"));
        if(c.getCurrentQuantity()<r.getQuantity()) throw new IllegalArgumentException("Insufficient stock. Available: "+c.getCurrentQuantity());
        c.setCurrentQuantity(c.getCurrentQuantity()-r.getQuantity()); components.save(c);
        r.setStatus(RequestStatus.APPROVED); requests.save(r);
        notifications.create(r.getEmployee(),"Inventory request approved","Your request for "+r.getQuantity()+" "+c.getUnit()+" of "+c.getName()+" has been approved.","INVENTORY",false);
        StockTransaction t=new StockTransaction(); t.setComponent(c); t.setTransactionType(TransactionType.OUT); t.setQuantity(r.getQuantity());
        t.setPurpose("Employee request: "+(r.getPurpose()==null?"":r.getPurpose())); t.setCreatedBy(admin); transactions.save(t);
        log(admin,"APPROVE_REQUEST","Approved request #"+id+" for "+c.getName()); return requestDto(r);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> myInventory(String user){
        return requests.findByEmployeeEmployeeIdOrderByRequestedAtDesc(user).stream()
            .filter(r->r.getStatus()==RequestStatus.APPROVED)
            .filter(r->!updates.existsByRequestIdAndUsageStatus(r.getId(),UsageStatus.RETURNED))
            .map(this::requestDto).toList();
    }

    @Transactional
    public Map<String,Object> usage(String user,Map<String,Object>b){
        InventoryRequest r=requests.findById(num(b.get("requestId"))).orElseThrow(()->new IllegalArgumentException("Request not found"));
        if(!r.getEmployee().getEmployeeId().equals(user)||r.getStatus()!=RequestStatus.APPROVED) throw new IllegalArgumentException("Invalid inventory request");
        InventoryUsageUpdate u=new InventoryUsageUpdate(); u.setRequest(r); u.setComponent(r.getComponent()); u.setEmployee(r.getEmployee());
        int reportedQty=qty(b.getOrDefault("quantity",r.getQuantity()));
        if(reportedQty>r.getQuantity()) throw new IllegalArgumentException("Reported quantity cannot exceed the issued quantity");
        u.setQuantity(reportedQty);
        try{u.setUsageStatus(UsageStatus.valueOf(String.valueOf(b.get("usageStatus")).toUpperCase()));}catch(Exception e){throw new IllegalArgumentException("Invalid usage status");}
        if(u.getUsageStatus()==UsageStatus.RETURNED) throw new IllegalArgumentException("Use RETURN_REQUESTED. An admin must approve the return.");
        u.setProjectName(text(b.get("projectName"))); u.setNotes(text(b.get("notes"))); updates.save(u);
        log(user,"USAGE_UPDATE","Updated "+r.getComponent().getName()+" as "+u.getUsageStatus()); return usageDto(u);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> myUsage(String user){return updates.findByEmployeeEmployeeIdOrderByCreatedAtDesc(user).stream().map(this::usageDto).toList();}

    @Transactional(readOnly = true)
    public List<Map<String,Object>> allUsage(){return updates.findAllByOrderByCreatedAtDesc().stream().map(this::usageDto).toList();}

    @Transactional
    public Map<String,Object> reviewUsage(Long id,Map<String,Object>b,String admin){
        InventoryUsageUpdate u=updates.findById(id).orElseThrow(()->new IllegalArgumentException("Usage update not found"));
        if(u.getUsageStatus()!=UsageStatus.RETURN_REQUESTED) throw new IllegalArgumentException("Only return requests need approval");
        boolean approve=Boolean.TRUE.equals(b.get("approved"));
        if(approve){
            Component c=components.findWithLockById(u.getComponent().getId()).orElseThrow(()->new IllegalArgumentException("Component not found")); c.setCurrentQuantity(c.getCurrentQuantity()+u.getQuantity()); components.save(c);
            StockTransaction t=new StockTransaction(); t.setComponent(c); t.setTransactionType(TransactionType.IN); t.setQuantity(u.getQuantity());
            t.setPurpose("Approved asset return"); t.setCreatedBy(admin); transactions.save(t);
            u.setUsageStatus(UsageStatus.RETURNED); notifications.create(u.getEmployee(),"Inventory return approved","Your return of "+u.getQuantity()+" "+c.getUnit()+" of "+c.getName()+" was approved.","INVENTORY",false); log(admin,"APPROVE_RETURN","Returned "+u.getQuantity()+" "+c.getUnit()+" of "+c.getName());
        } else { u.setUsageStatus(UsageStatus.DAMAGED); notifications.create(u.getEmployee(),"Inventory return not approved","Your return request for "+u.getComponent().getName()+" was not approved and was marked for damage review.","INVENTORY",false); log(admin,"REJECT_RETURN","Return rejected/marked damaged for "+u.getComponent().getName()); }
        return usageDto(updates.save(u));
    }

    private void log(String actor,String action,String details){AuditLog l=new AuditLog();l.setActor(actor);l.setAction(action);l.setDetails(details);audit.save(l);}
    private Employee employee(String id){return employees.findByEmployeeId(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));}
    private Component component(Long id){return components.findById(id).orElseThrow(()->new IllegalArgumentException("Component not found"));}
    private Long num(Object v){try{return Long.valueOf(String.valueOf(v));}catch(Exception e){throw new IllegalArgumentException("Invalid component/request id");}}
    private int qty(Object v){try{int q=Integer.parseInt(String.valueOf(v));if(q<=0)throw new Exception();return q;}catch(Exception e){throw new IllegalArgumentException("Quantity must be greater than zero");}}
    private String text(Object v){return v==null?null:String.valueOf(v).trim();}
    private Map<String,Object> componentDto(Component c){
        if(c==null) return new LinkedHashMap<>();
        Map<String,Object>m=new LinkedHashMap<>();
        m.put("id",c.getId());
        m.put("name",c.getName()==null?"":c.getName());
        m.put("componentCode",c.getComponentCode()==null?"":c.getComponentCode());
        m.put("category",c.getCategory()==null?"":c.getCategory().getName());
        m.put("availableQuantity",c.getCurrentQuantity()==null?0:c.getCurrentQuantity());
        m.put("minimumQuantity",c.getMinimumQuantity()==null?0:c.getMinimumQuantity());
        m.put("storageLocation",c.getStorageLocation()==null?"":c.getStorageLocation());
        return m;
    }
    private Map<String,Object> requestDto(InventoryRequest r){
        if(r==null) return new LinkedHashMap<>();
        Map<String,Object>m=new LinkedHashMap<>();
        m.put("id",r.getId());
        m.put("component",r.getComponent()!=null?componentDto(r.getComponent()):new LinkedHashMap<>());
        Map<String,Object> empMap=new LinkedHashMap<>();
        if(r.getEmployee()!=null){
            empMap.put("id",r.getEmployee().getId());
            empMap.put("employeeId",r.getEmployee().getEmployeeId()==null?"":r.getEmployee().getEmployeeId());
            empMap.put("name",r.getEmployee().getName()==null?"":r.getEmployee().getName());
            empMap.put("department",r.getEmployee().getDepartment()==null?"":r.getEmployee().getDepartment());
        }
        m.put("employee",empMap);
        m.put("quantity",r.getQuantity()==null?0:r.getQuantity());
        m.put("purpose",r.getPurpose()==null?"":r.getPurpose());
        m.put("status",r.getStatus()==null?"":r.getStatus().name());
        m.put("requestedAt",r.getRequestedAt());
        m.put("reviewedAt",r.getReviewedAt());
        m.put("reviewedBy",r.getReviewedBy()==null?"":r.getReviewedBy());
        m.put("adminRemark",r.getAdminRemark()==null?"":r.getAdminRemark());
        return m;
    }
    private Map<String,Object> usageDto(InventoryUsageUpdate u){
        if(u==null) return new LinkedHashMap<>();
        Map<String,Object>m=new LinkedHashMap<>();
        m.put("id",u.getId());
        m.put("requestId",u.getRequest()!=null?u.getRequest().getId():null);
        m.put("component",u.getComponent()!=null?componentDto(u.getComponent()):new LinkedHashMap<>());
        Map<String,Object> empMap=new LinkedHashMap<>();
        if(u.getEmployee()!=null){
            empMap.put("employeeId",u.getEmployee().getEmployeeId()==null?"":u.getEmployee().getEmployeeId());
            empMap.put("name",u.getEmployee().getName()==null?"":u.getEmployee().getName());
        }
        m.put("employee",empMap);
        m.put("quantity",u.getQuantity()==null?0:u.getQuantity());
        m.put("usageStatus",u.getUsageStatus()==null?"":u.getUsageStatus().name());
        m.put("projectName",u.getProjectName()==null?"":u.getProjectName());
        m.put("notes",u.getNotes()==null?"":u.getNotes());
        m.put("createdAt",u.getCreatedAt());
        return m;
    }
}
