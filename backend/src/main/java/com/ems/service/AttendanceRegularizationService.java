package com.ems.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.model.Attendance;
import com.ems.model.AttendanceRegularizationRequest;
import com.ems.model.Department;
import com.ems.model.Employee;
import com.ems.model.Role;
import com.ems.repository.AttendanceRegularizationRepository;
import com.ems.repository.AttendanceRepository;
import com.ems.repository.DepartmentRepository;
import com.ems.repository.EmployeeRepository;

@Service
public class AttendanceRegularizationService {
    private final AttendanceRegularizationRepository requests;
    private final AttendanceRepository attendance;
    private final EmployeeRepository employees;
    private final DepartmentRepository departments;
    private final NotificationService notifications;
    private final AuditService audit;
    private final SystemSettingsService settings;

    public AttendanceRegularizationService(AttendanceRegularizationRepository r,AttendanceRepository a,EmployeeRepository e,
                                           DepartmentRepository d,NotificationService n,AuditService au,SystemSettingsService s){
        requests=r;attendance=a;employees=e;departments=d;notifications=n;audit=au;settings=s;
    }

    @Transactional
    public AttendanceRegularizationRequest create(String employeeId,Long attendanceId,LocalDateTime checkIn,LocalDateTime checkOut,String reason,Authentication auth){
        Employee e=employees.findByEmployeeId(employeeId).orElseThrow(()->new IllegalArgumentException("Employee not found"));
        if(attendanceId==null)throw new IllegalArgumentException("Attendance record is required");
        if(e.getRole()==Role.SYSTEM_ADMIN)throw new IllegalArgumentException("Organization Admin accounts do not use attendance regularization");
        if(reason==null||reason.isBlank())throw new IllegalArgumentException("A reason is required");
        Attendance a=attendance.findById(attendanceId).orElseThrow(()->new IllegalArgumentException("Attendance record not found"));
        if(!a.getEmployee().getId().equals(e.getId()))throw new SecurityException("You can only correct your own attendance");
        if(a.getWorkDate()==null||a.getWorkDate().isAfter(settings.today()))throw new IllegalArgumentException("Attendance date cannot be in the future");
        if(checkIn==null && checkOut==null)throw new IllegalArgumentException("Provide a requested check-in or check-out time");
        if(checkIn!=null && checkOut!=null && !checkOut.isAfter(checkIn))throw new IllegalArgumentException("Check-out must be after check-in");
        boolean already=requests.findByEmployeeEmployeeIdOrderByCreatedAtDesc(employeeId).stream().anyMatch(x->x.getAttendance().getId().equals(attendanceId)&&x.getStatus()==AttendanceRegularizationRequest.RegularizationStatus.PENDING);
        if(already)throw new IllegalArgumentException("A regularization request is already pending for this attendance record");
        AttendanceRegularizationRequest r=new AttendanceRegularizationRequest();r.setEmployee(e);r.setAttendance(a);r.setRequestedCheckIn(checkIn);r.setRequestedCheckOut(checkOut);r.setReason(reason.trim());
        AttendanceRegularizationRequest saved=requests.save(r);
        Employee manager=e.getReportingManager();
        if(manager==null&&e.getDepartment()!=null)manager=departments.findByNameIgnoreCase(e.getDepartment()).map(Department::getManager).orElse(null);
        String msg=e.getName()+" requested attendance correction for "+a.getWorkDate()+".";
        if(manager!=null&&manager.isActive())notifications.create(manager,"Attendance correction approval required",msg,"ATTENDANCE",true);else notifications.notifyAdmins("Attendance correction request",msg,"ATTENDANCE");
        audit.log(auth,"ATTENDANCE_REGULARIZATION_CREATED","Created attendance regularization "+saved.getId(),"ATTENDANCE_REGULARIZATION",saved.getId(),"SUCCESS",null,reason);
        return saved;
    }

    public List<AttendanceRegularizationRequest> my(String employeeId){return requests.findByEmployeeEmployeeIdOrderByCreatedAtDesc(employeeId);}

    public List<AttendanceRegularizationRequest> all(){ return requests.findAllWithDetails(); }

    @Transactional
    public AttendanceRegularizationRequest adminReview(Long id,String status,String reason,Authentication auth){
        if(auth==null || auth.getAuthorities().stream().noneMatch(a->a.getAuthority().equals("ROLE_SYSTEM_ADMIN")||a.getAuthority().equals("ROLE_HR_ADMIN")))
            throw new SecurityException("Administrative access required");
        AttendanceRegularizationRequest r=requests.findById(id).orElseThrow(()->new IllegalArgumentException("Regularization request not found"));
        if(r.getStatus()!=AttendanceRegularizationRequest.RegularizationStatus.PENDING)
            throw new IllegalArgumentException("Only pending attendance corrections can be reviewed");
        String st=String.valueOf(status).toUpperCase(Locale.ROOT);
        if(!st.equals("APPROVED")&&!st.equals("REJECTED"))throw new IllegalArgumentException("Status must be APPROVED or REJECTED");
        reason=reason==null?"":reason.trim(); if(st.equals("REJECTED")&&reason.isBlank())throw new IllegalArgumentException("A rejection reason is required");
        if(st.equals("APPROVED")){
            Attendance a=r.getAttendance();
            LocalDateTime in=r.getRequestedCheckIn()!=null?r.getRequestedCheckIn():a.getCheckInTime();
            LocalDateTime out=r.getRequestedCheckOut()!=null?r.getRequestedCheckOut():a.getCheckOutTime();
            if(in==null)throw new IllegalArgumentException("Approved correction must include check-in time");
            if(out!=null&&!out.isAfter(in))throw new IllegalArgumentException("Check-out must be after check-in");
            a.setCheckInTime(in); a.setCheckOutTime(out);
            if(out!=null){long minutes=Math.max(0,Duration.between(in,out).toMinutes());a.setWorkingMinutes(minutes);a.setWorkingHours(Math.round(minutes/60.0*100.0)/100.0);a.setOvertimeMinutes(Math.max(0,minutes-settings.getInt("MIN_WORK_MINUTES",480)));}
            LocalTime start=LocalTime.parse(settings.getString("WORK_START_TIME","09:00")); LocalTime cutoff=start.plusMinutes(settings.getInt("LATE_GRACE_MINUTES",10));
            a.setStatus(in.toLocalTime().isAfter(cutoff)?Attendance.AttendanceStatus.LATE:Attendance.AttendanceStatus.PRESENT);
            attendance.save(a);
        }
        r.setStatus(AttendanceRegularizationRequest.RegularizationStatus.valueOf(st));r.setReviewedBy(auth.getName());r.setReviewedAt(settings.now());r.setReviewReason(reason.isBlank()?null:reason);
        AttendanceRegularizationRequest saved=requests.save(r);
        notifications.create(r.getEmployee(),"Attendance correction "+st.toLowerCase(),"Your attendance correction was "+st.toLowerCase()+(reason.isBlank()?"":" . Reason: "+reason),"ATTENDANCE",true);
        audit.log(auth,"ATTENDANCE_REGULARIZATION_"+st,(st.equals("APPROVED")?"Approved":"Rejected")+" attendance regularization "+id,"ATTENDANCE_REGULARIZATION",id,"SUCCESS",null,reason.isBlank()?null:reason);
        return saved;
    }

    public List<AttendanceRegularizationRequest> pendingForManager(Employee manager){
        return requests.findByStatusOrderByCreatedAtAsc(AttendanceRegularizationRequest.RegularizationStatus.PENDING).stream()
                .filter(r->responsible(manager,r.getEmployee())).toList();
    }

    @Transactional
    public AttendanceRegularizationRequest review(Long id,String status,String reason,Authentication auth,Employee manager){
        AttendanceRegularizationRequest r=requests.findById(id).orElseThrow(()->new IllegalArgumentException("Regularization request not found"));
        if(!responsible(manager,r.getEmployee()))throw new SecurityException("You can only review attendance corrections for your team");
        if(r.getStatus()!=AttendanceRegularizationRequest.RegularizationStatus.PENDING)throw new IllegalArgumentException("Only pending attendance corrections can be reviewed");
        String st=String.valueOf(status).toUpperCase(Locale.ROOT);
        if(!st.equals("APPROVED")&&!st.equals("REJECTED"))throw new IllegalArgumentException("Status must be APPROVED or REJECTED");
        reason=reason==null?"":reason.trim();if(st.equals("REJECTED")&&reason.isBlank())throw new IllegalArgumentException("A rejection reason is required");
        if(st.equals("APPROVED")){
            Attendance a=r.getAttendance();
            LocalDateTime in=r.getRequestedCheckIn()!=null?r.getRequestedCheckIn():a.getCheckInTime();
            LocalDateTime out=r.getRequestedCheckOut()!=null?r.getRequestedCheckOut():a.getCheckOutTime();
            if(in==null)throw new IllegalArgumentException("Approved correction must include check-in time");
            if(out!=null&&!out.isAfter(in))throw new IllegalArgumentException("Check-out must be after check-in");
            a.setCheckInTime(in);
            a.setCheckOutTime(out);
            if(out!=null){
                long minutes=Math.max(0,Duration.between(in,out).toMinutes());
                a.setWorkingMinutes(minutes);a.setWorkingHours(Math.round(minutes/60.0*100.0)/100.0);
                a.setOvertimeMinutes(Math.max(0,minutes-settings.getInt("MIN_WORK_MINUTES",480)));
            }
            LocalTime start=LocalTime.parse(settings.getString("WORK_START_TIME","09:00")); LocalTime cutoff=start.plusMinutes(settings.getInt("LATE_GRACE_MINUTES",10));
            a.setStatus(in.toLocalTime().isAfter(cutoff)?Attendance.AttendanceStatus.LATE:Attendance.AttendanceStatus.PRESENT);
            attendance.save(a);
        }
        r.setStatus(AttendanceRegularizationRequest.RegularizationStatus.valueOf(st));r.setReviewedBy(manager.getName());r.setReviewedAt(settings.now());r.setReviewReason(reason.isBlank()?null:reason);
        AttendanceRegularizationRequest saved=requests.save(r);
        notifications.create(r.getEmployee(),"Attendance correction "+st.toLowerCase(),"Your attendance correction was "+st.toLowerCase()+(reason.isBlank()?"":" . Reason: "+reason),"ATTENDANCE",true);
        audit.log(auth,"ATTENDANCE_REGULARIZATION_"+st,"Manager "+st.toLowerCase()+" attendance regularization "+id,"ATTENDANCE_REGULARIZATION",id,"SUCCESS",null,reason.isBlank()?null:reason);
        return saved;
    }

    private boolean responsible(Employee m,Employee e){
        if(e==null)return false;
        if(e.getReportingManager()!=null&&e.getReportingManager().getId().equals(m.getId()))return true;
        return departments.findByManagerId(m.getId()).stream().anyMatch(d->d.isActive()&&d.getName().equalsIgnoreCase(e.getDepartment()));
    }
}
