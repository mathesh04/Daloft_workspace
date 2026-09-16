package com.ems.service;

import java.time.LocalDateTime;
import java.util.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.model.*;
import com.ems.repository.*;

@Service
public class EmployeeInventoryService {
    private final ComponentRepository components;
    private final EmployeeRepository employees;
    private final InventoryRequestRepository requests;
    private final InventoryUsageUpdateRepository updates;
    private final StockTransactionRepository transactions;
    private final AuditLogRepository audit;
    private final NotificationService notifications;

    public EmployeeInventoryService(ComponentRepository c, EmployeeRepository e, InventoryRequestRepository r,
                                    InventoryUsageUpdateRepository u, StockTransactionRepository t,
                                    AuditLogRepository a, NotificationService n) {
        components=c; employees=e; requests=r; updates=u; transactions=t; audit=a; notifications=n;
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> available(){
        return components.findAllByOrderByNameAsc().stream().map(this::componentDto).toList();
    }

    @Transactional
    public Map<String,Object> request(String user, Map<String,Object> b){
        Component c=component(num(b.get("componentId"))); int q=qty(b.get("quantity"));
        if(c.getCurrentQuantity()<q) throw new IllegalArgumentException("Only "+c.getCurrentQuantity()+" available");
        InventoryRequest r=new InventoryRequest(); r.setComponent(c); r.setEmployee(employee(user)); r.setQuantity(q); r.setPurpose(text(b.get("purpose")));
        requests.save(r);
        notifications.notifyAdmins("Inventory request pending", employee(user).getName()+" requested "+q+" "+c.getUnit()+" of "+c.getName()+".","INVENTORY");
        log(user,"REQUEST_ITEM","Requested "+q+" "+c.getUnit()+" of "+c.getName()); return requestDto(r);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> myRequests(String user){
        return requests.findByEmployeeEmployeeIdOrderByRequestedAtDesc(user).stream().map(this::requestDto).toList();
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> allRequests(){
        return requests.findAllByOrderByRequestedAtDesc().stream().map(this::requestDto).toList();
    }

    @Transactional
    public Map<String,Object> review(Long id, Map<String,Object> b, String admin){
        InventoryRequest r=requests.findByIdForUpdate(id).orElseThrow(()->new IllegalArgumentException("Request not found"));
        if(r.getStatus()!=RequestStatus.PENDING) throw new IllegalArgumentException("Request already reviewed");
        boolean approve=Boolean.TRUE.equals(b.get("approved"));
        r.setAdminRemark(text(b.get("remark"))); r.setReviewedAt(LocalDateTime.now()); r.setReviewedBy(admin);
        if(!approve){
            r.setStatus(RequestStatus.REJECTED); InventoryRequest saved=requests.save(r);
            notifications.create(r.getEmployee(),"Inventory request rejected","Your inventory request #"+id+" was rejected.","INVENTORY",false);
            log(admin,"REJECT_REQUEST","Rejected request #"+id); return requestDto(saved);
        }
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
            .map(r->{Map<String,Object> dto=requestDto(r); int remaining=remainingQuantity(r); dto.put("issuedQuantity", safeQty(r.getQuantity())); dto.put("remainingQuantity", remaining); dto.put("assignmentStatus", remaining==0?"CLOSED":"ASSIGNED"); return dto;})
            .filter(m->((Number)m.get("remainingQuantity")).intValue()>0)
            .toList();
    }

    @Transactional
    public Map<String,Object> usage(String user, Map<String,Object> b){
        InventoryRequest r=requests.findById(num(b.get("requestId"))).orElseThrow(()->new IllegalArgumentException("Request not found"));
        if(!r.getEmployee().getEmployeeId().equals(user)||r.getStatus()!=RequestStatus.APPROVED) throw new IllegalArgumentException("Invalid inventory request");
        UsageStatus status;
        try{status=UsageStatus.valueOf(String.valueOf(b.get("usageStatus")).toUpperCase());}catch(Exception e){throw new IllegalArgumentException("Invalid usage status");}
        if(status==UsageStatus.RETURNED || status==UsageStatus.RETURN_REJECTED) throw new IllegalArgumentException("This usage status is managed by the inventory review workflow.");
        int reportedQty=qty(b.getOrDefault("quantity",r.getQuantity()));
        int remaining=remainingQuantity(r);
        if(reportedQty>remaining) throw new IllegalArgumentException("Only "+remaining+" unit(s) remain assigned and available for this update.");
        if(status==UsageStatus.RETURN_REQUESTED && updates.existsByRequestIdAndUsageStatus(r.getId(),UsageStatus.RETURN_REQUESTED))
            throw new IllegalArgumentException("A return request is already waiting for admin review.");
        InventoryUsageUpdate u=new InventoryUsageUpdate(); u.setRequest(r); u.setComponent(r.getComponent()); u.setEmployee(r.getEmployee()); u.setQuantity(reportedQty); u.setUsageStatus(status);
        u.setProjectName(text(b.get("projectName"))); u.setNotes(text(b.get("notes"))); updates.save(u);
        log(user,"USAGE_UPDATE","Updated "+r.getComponent().getName()+" as "+u.getUsageStatus()); return usageDto(u);
    }

    @Transactional(readOnly = true)
    public List<Map<String,Object>> myUsage(String user){return updates.findByEmployeeEmployeeIdOrderByCreatedAtDesc(user).stream().map(this::usageDto).toList();}
    @Transactional(readOnly = true)
    public List<Map<String,Object>> allUsage(){return updates.findAllByOrderByCreatedAtDesc().stream().map(this::usageDto).toList();}

    @Transactional
    public Map<String,Object> reviewUsage(Long id, Map<String,Object> b, String admin){
        InventoryUsageUpdate u=updates.findByIdForUpdate(id).orElseThrow(()->new IllegalArgumentException("Usage update not found"));
        if(u.getUsageStatus()!=UsageStatus.RETURN_REQUESTED) throw new IllegalArgumentException("Only return requests need approval");
        boolean approve=Boolean.TRUE.equals(b.get("approved"));
        if(approve){
            Component c=components.findWithLockById(u.getComponent().getId()).orElseThrow(()->new IllegalArgumentException("Component not found"));
            int remainingAtReview=remainingQuantityExcluding(u.getRequest(), u.getId());
            if(u.getQuantity()>remainingAtReview) throw new IllegalArgumentException("This return quantity is no longer available on the assignment.");
            c.setCurrentQuantity(c.getCurrentQuantity()+u.getQuantity()); components.save(c);
            StockTransaction t=new StockTransaction(); t.setComponent(c); t.setTransactionType(TransactionType.IN); t.setQuantity(u.getQuantity());
            t.setPurpose("Approved asset return"); t.setCreatedBy(admin); transactions.save(t);
            u.setUsageStatus(UsageStatus.RETURNED); notifications.create(u.getEmployee(),"Inventory return approved","Your return of "+u.getQuantity()+" "+c.getUnit()+" of "+c.getName()+" was approved.","INVENTORY",false); log(admin,"APPROVE_RETURN","Returned "+u.getQuantity()+" "+c.getUnit()+" of "+c.getName());
        } else {
            u.setUsageStatus(UsageStatus.RETURN_REJECTED); notifications.create(u.getEmployee(),"Inventory return not approved","Your return request for "+u.getComponent().getName()+" was not approved. The item remains assigned to you; submit a new return request if appropriate.","INVENTORY",false); log(admin,"REJECT_RETURN","Return rejected; assignment remains open for "+u.getComponent().getName());
        }
        return usageDto(updates.save(u));
    }

    private int remainingQuantity(InventoryRequest r){ return remainingQuantityExcluding(r, null); }
    private int remainingQuantityExcluding(InventoryRequest r, Long excludedId){
        int issued=safeQty(r.getQuantity());
        int closed=updates.findByRequestId(r.getId()).stream()
            .filter(u->excludedId==null || !Objects.equals(u.getId(),excludedId))
            .filter(u->u.getUsageStatus()==UsageStatus.RETURNED || u.getUsageStatus()==UsageStatus.CONSUMED || u.getUsageStatus()==UsageStatus.DAMAGED)
            .mapToInt(u->safeQty(u.getQuantity())).sum();
        int pending=updates.findByRequestId(r.getId()).stream()
            .filter(u->excludedId==null || !Objects.equals(u.getId(),excludedId))
            .filter(u->u.getUsageStatus()==UsageStatus.RETURN_REQUESTED)
            .mapToInt(u->safeQty(u.getQuantity())).sum();
        return Math.max(0, issued-closed-pending);
    }

    private int safeQty(Integer q){return q==null?0:Math.max(0,q);}
    private void log(String actor,String action,String details){AuditLog l=new AuditLog();l.setActor(actor);l.setAction(action);l.setDetails(details);audit.save(l);}
    private Employee employee(String id){return employees.findByEmployeeId(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));}
    private Component component(Long id){return components.findById(id).orElseThrow(()->new IllegalArgumentException("Component not found"));}
    private Long num(Object v){try{return Long.valueOf(String.valueOf(v));}catch(Exception e){throw new IllegalArgumentException("Invalid component/request id");}}
    private int qty(Object v){try{int q=Integer.parseInt(String.valueOf(v));if(q<=0)throw new Exception();return q;}catch(Exception e){throw new IllegalArgumentException("Quantity must be greater than zero");}}
    private String text(Object v){return v==null?null:String.valueOf(v).trim();}
    private Map<String,Object> componentDto(Component c){
        Map<String,Object>m=new LinkedHashMap<>(); if(c==null)return m; m.put("id",c.getId());m.put("name",c.getName()==null?"":c.getName());m.put("componentCode",c.getComponentCode()==null?"":c.getComponentCode());m.put("category",c.getCategory()==null?"":c.getCategory().getName());m.put("availableQuantity",safeQty(c.getCurrentQuantity()));m.put("minimumQuantity",safeQty(c.getMinimumQuantity()));m.put("storageLocation",c.getStorageLocation()==null?"":c.getStorageLocation());return m;
    }
    private Map<String,Object> requestDto(InventoryRequest r){
        Map<String,Object>m=new LinkedHashMap<>(); if(r==null)return m; m.put("id",r.getId());m.put("component",r.getComponent()!=null?componentDto(r.getComponent()):new LinkedHashMap<>());Map<String,Object> emp=new LinkedHashMap<>();if(r.getEmployee()!=null){emp.put("id",r.getEmployee().getId());emp.put("employeeId",r.getEmployee().getEmployeeId()==null?"":r.getEmployee().getEmployeeId());emp.put("name",r.getEmployee().getName()==null?"":r.getEmployee().getName());emp.put("department",r.getEmployee().getDepartment()==null?"":r.getEmployee().getDepartment());}m.put("employee",emp);m.put("quantity",safeQty(r.getQuantity()));m.put("purpose",r.getPurpose()==null?"":r.getPurpose());m.put("status",r.getStatus()==null?"":r.getStatus().name());m.put("requestedAt",r.getRequestedAt());m.put("reviewedAt",r.getReviewedAt());m.put("reviewedBy",r.getReviewedBy()==null?"":r.getReviewedBy());m.put("adminRemark",r.getAdminRemark()==null?"":r.getAdminRemark());return m;
    }
    private Map<String,Object> usageDto(InventoryUsageUpdate u){
        Map<String,Object>m=new LinkedHashMap<>(); if(u==null)return m; m.put("id",u.getId());m.put("requestId",u.getRequest()!=null?u.getRequest().getId():null);m.put("component",u.getComponent()!=null?componentDto(u.getComponent()):new LinkedHashMap<>());Map<String,Object> emp=new LinkedHashMap<>();if(u.getEmployee()!=null){emp.put("employeeId",u.getEmployee().getEmployeeId()==null?"":u.getEmployee().getEmployeeId());emp.put("name",u.getEmployee().getName()==null?"":u.getEmployee().getName());}m.put("employee",emp);m.put("quantity",safeQty(u.getQuantity()));m.put("usageStatus",u.getUsageStatus()==null?"":u.getUsageStatus().name());m.put("projectName",u.getProjectName()==null?"":u.getProjectName());m.put("notes",u.getNotes()==null?"":u.getNotes());m.put("createdAt",u.getCreatedAt());return m;
    }
}
