package com.ems.controller;

import com.ems.model.*;
import com.ems.repository.*;
import com.ems.service.SystemSettingsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {
    private final EmployeeRepository employees;
    private final AttendanceRepository attendance;
    private final LeaveRequestRepository leaves;
    private final ComponentRepository components;
    private final DamageReportRepository damageReports;
    private final InventoryRequestRepository inventoryRequests;
    private final AuditLogRepository auditLogs;
    private final com.ems.service.HolidayService holidays; private final SystemSettingsService settings;

    public AdminAnalyticsController(EmployeeRepository employees, AttendanceRepository attendance,
                                    LeaveRequestRepository leaves, ComponentRepository components,
                                    DamageReportRepository damageReports, InventoryRequestRepository inventoryRequests, 
                                    AuditLogRepository auditLogs, com.ems.service.HolidayService holidays, 
                                    SystemSettingsService settings) {
        this.employees = employees; 
        this.attendance = attendance; 
        this.leaves = leaves;
        this.components = components; 
        this.damageReports = damageReports;
        this.inventoryRequests = inventoryRequests; 
        this.auditLogs = auditLogs; 
        this.holidays = holidays; 
        this.settings=settings;
    }

    @GetMapping("/summary")
    public Map<String,Object> summary() {
        LocalDate today = settings.today();
        List<Employee> active = employees.findAll().stream().filter(Employee::isActive).filter(e->e.getRole()!=Role.SYSTEM_ADMIN).toList();
        List<Attendance> todayAttendance = attendance.findByWorkDateOrderByCheckInTimeDesc(today);
        long present = todayAttendance.stream().filter(a -> a.getCheckInTime()!=null).map(a->a.getEmployee().getId()).distinct().count();
        long onLeave = leaves.findAll().stream().filter(l -> l.getStatus()==LeaveStatus.APPROVED
                && l.getStartDate()!=null && l.getEndDate()!=null
                && !today.isBefore(l.getStartDate()) && !today.isAfter(l.getEndDate()))
                .map(l->l.getEmployee().getId()).distinct().count();
        long lowStock = components.findAll().stream().filter(c -> c.getCurrentQuantity()!=null && c.getMinimumQuantity()!=null && c.getCurrentQuantity() <= c.getMinimumQuantity()).count();
        long openDamage = damageReports.findAll().stream().filter(d -> d.getStatus()!=null && !Set.of("RESOLVED","CLOSED","REJECTED").contains(d.getStatus().toUpperCase())).count();
        long pendingLeaves = leaves.findAll().stream().filter(l -> l.getStatus()==LeaveStatus.PENDING).count();
        long pendingInventory = inventoryRequests.findAll().stream().filter(r -> r.getStatus()==RequestStatus.PENDING).count();
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("totalEmployees", active.size()); m.put("presentToday", present); m.put("employeesOnLeave", onLeave);
        long absentToday = holidays.isWorkingDay(today) ? Math.max(0, active.size()-present-onLeave) : 0;
        m.put("holidayToday", holidays.isHoliday(today));
        m.put("absentToday", absentToday);
        m.put("totalInventoryItems", components.count()); m.put("lowStockItems", lowStock);
        m.put("openDamageReports", openDamage); m.put("pendingRequests", pendingLeaves+pendingInventory);
        return m;
    }

    @GetMapping("/attendance")
    public List<Map<String,Object>> attendanceTrend(@RequestParam(defaultValue="7") int days) {
        int safeDays=Math.max(1,Math.min(days,31)); LocalDate start=settings.today().minusDays(safeDays-1);
        List<Employee> active=employees.findAll().stream().filter(Employee::isActive).filter(e->e.getRole()!=Role.SYSTEM_ADMIN).toList();
        List<Map<String,Object>> out=new ArrayList<>();
        for(int i=0;i<safeDays;i++){
            LocalDate d=start.plusDays(i); List<Attendance> rows=attendance.findByWorkDateOrderByCheckInTimeDesc(d);
            long present=rows.stream().filter(a->a.getCheckInTime()!=null).map(a->a.getEmployee().getId()).distinct().count();
            long late=rows.stream().filter(a->a.getStatus()==Attendance.AttendanceStatus.LATE).count();
            long leaveCount=leaves.findAll().stream().filter(l->l.getStatus()==LeaveStatus.APPROVED && l.getStartDate()!=null && l.getEndDate()!=null && !d.isBefore(l.getStartDate()) && !d.isAfter(l.getEndDate())).map(l->l.getEmployee().getId()).distinct().count();
            Map<String,Object> x=new LinkedHashMap<>(); x.put("date",d.toString()); x.put("present",present); x.put("late",late); x.put("holiday",holidays.isHoliday(d)); x.put("workingDay",holidays.isWorkingDay(d)); x.put("absent",holidays.isWorkingDay(d)?Math.max(0,active.size()-present-leaveCount):0); out.add(x);
        } return out;
    }

    @GetMapping("/departments")
    public List<Map<String,Object>> departments(){
        return employees.findAll().stream().filter(Employee::isActive).collect(Collectors.groupingBy(e->e.getDepartment()==null||e.getDepartment().isBlank()?"Unassigned":e.getDepartment(), LinkedHashMap::new, Collectors.counting()))
                .entrySet().stream().map(e->{Map<String,Object> m=new LinkedHashMap<>();m.put("department",e.getKey());m.put("count",e.getValue());return m;}).toList();
    }

    @GetMapping("/inventory")
    public Map<String,Object> inventory(){
        List<Component> list=components.findAll();
        Map<String,Object> m=new LinkedHashMap<>();
        m.put("totalUnits", list.stream().mapToLong(c->c.getCurrentQuantity()==null?0:c.getCurrentQuantity()).sum());
        m.put("lowStock", list.stream().filter(c->c.getCurrentQuantity()!=null&&c.getMinimumQuantity()!=null&&c.getCurrentQuantity()<=c.getMinimumQuantity()).map(c->{Map<String,Object>x=new LinkedHashMap<>();x.put("id",c.getId());x.put("name",c.getName());x.put("quantity",c.getCurrentQuantity());x.put("minimumQuantity",c.getMinimumQuantity());return x;}).toList());
        m.put("byCategory", list.stream().collect(Collectors.groupingBy(c->c.getCategory()==null?"Uncategorized":c.getCategory().getName(),LinkedHashMap::new,Collectors.counting())).entrySet().stream().map(e->{Map<String,Object>x=new LinkedHashMap<>();x.put("category",e.getKey());x.put("count",e.getValue());return x;}).toList());
        return m;
    }

    @GetMapping("/leaves")
    public Map<String,Object> leaveStats(){
        List<LeaveRequest> all=leaves.findAll(); Map<String,Object> m=new LinkedHashMap<>();
        m.put("pending",all.stream().filter(l->l.getStatus()==LeaveStatus.PENDING).count());
        m.put("approved",all.stream().filter(l->l.getStatus()==LeaveStatus.APPROVED).count());
        m.put("rejected",all.stream().filter(l->l.getStatus()==LeaveStatus.REJECTED).count()); return m;
    }
    @GetMapping("/recent-activity")
    public List<Map<String,Object>> recentActivity(){ return auditLogs.findTop50ByOrderByCreatedAtDesc().stream().limit(12).map(a->{Map<String,Object> m=new LinkedHashMap<>();m.put("actor",a.getActor());m.put("action",a.getAction());m.put("details",a.getDetails());m.put("createdAt",a.getCreatedAt());return m;}).toList(); }

}
