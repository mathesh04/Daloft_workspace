package com.ems.service;

import com.ems.dto.AttendanceLocationRequest;
import com.ems.model.*;
import com.ems.repository.*;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.List;

@Service
public class AttendanceService {
    private static final double EARTH_RADIUS_METERS=6_371_000.0;
    private final AttendanceRepository attendanceRepository; private final EmployeeRepository employeeRepository; private final OfficeLocationRepository officeLocationRepository; private final LeaveRequestRepository leaveRequestRepository; private final SystemSettingsService settings; private final HolidayService holidays;
    public AttendanceService(AttendanceRepository a,EmployeeRepository e,OfficeLocationRepository o,LeaveRequestRepository l,SystemSettingsService s,HolidayService h){attendanceRepository=a;employeeRepository=e;officeLocationRepository=o;leaveRequestRepository=l;settings=s;holidays=h;}
    private Employee employee(String id){Employee e=employeeRepository.findByEmployeeId(id).orElseThrow(()->new IllegalArgumentException("Employee not found"));if(e.getRole()==Role.SYSTEM_ADMIN)throw new IllegalStateException("Organization Admin accounts do not participate in employee attendance.");return e;}
    public boolean isGeofenceEnabled(){return settings.getBoolean("GEOFENCE_ENABLED",false);}
    public double getAllowedRadiusMeters(){return settings.getInt("GEOFENCE_RADIUS",100);}
    public boolean isAttendanceEnabled(){return settings.getBoolean("ATTENDANCE_ENABLED",true);}
    public boolean isCheckInEnabled(){return settings.getBoolean("CHECK_IN_ENABLED",true);}
    public boolean isCheckOutEnabled(){return settings.getBoolean("CHECK_OUT_ENABLED",true);}
    public Attendance checkIn(String employeeId,AttendanceLocationRequest location){
        Employee emp=employee(employeeId);
        ensureAttendanceAvailable();ensureCheckInAvailable();
        LocalDate today=settings.today();
        if(holidays.isHoliday(today))throw new IllegalStateException("Today is an organization holiday. Attendance check-in is not required.");
        Attendance row=attendanceRepository.findByEmployeeAndWorkDate(emp,today).orElse(null);
        if(row!=null&&row.getCheckInTime()!=null)throw new IllegalStateException("Already checked in today at "+row.getCheckInTime());
        boolean approvedWfh=isApprovedWorkFromHome(emp,today);
        LocationVerification v=(isGeofenceEnabled()&&!approvedWfh)?verifyLocation(location):new LocationVerification(0);
        if(row==null)row=new Attendance();
        row.setEmployee(emp);
        row.setWorkDate(today);
        LocalDateTime now=settings.now();
        row.setCheckInTime(now);
        if(isGeofenceEnabled()&&!approvedWfh){row.setCheckInLatitude(location.getLatitude());
            row.setCheckInLongitude(location.getLongitude());
            row.setCheckInAccuracy(location.getAccuracy());
            row.setCheckInDistanceMeters(v.distanceMeters());
            row.setCheckInLocationVerified(true);
        }
        LocalTime start=LocalTime.parse(settings.getString("WORK_START_TIME","09:00")); 
        LocalTime cutoff=start.plusMinutes(settings.getInt("LATE_GRACE_MINUTES",10));
        row.setStatus(approvedWfh?Attendance.AttendanceStatus.WORK_FROM_HOME:(now.toLocalTime().isAfter(cutoff)?Attendance.AttendanceStatus.LATE:Attendance.AttendanceStatus.PRESENT));
    return attendanceRepository.save(row);}
    public Attendance checkOut(String employeeId,AttendanceLocationRequest location){
        Employee emp=employee(employeeId);
        ensureAttendanceAvailable();
        ensureCheckOutAvailable();
        Attendance row=attendanceRepository.findByEmployeeAndWorkDate(emp,settings.today()).orElseThrow(()->new IllegalStateException("You must check in before checking out"));
        if(row.getCheckOutTime()!=null)throw new IllegalStateException("Already checked out today at "+row.getCheckOutTime());
        boolean approvedWfh=isApprovedWorkFromHome(emp,settings.today());
        LocationVerification v=(isGeofenceEnabled()&&!approvedWfh)?verifyLocation(location):new LocationVerification(0);
        LocalDateTime now=settings.now();
        row.setCheckOutTime(now);
        long mins=Duration.between(row.getCheckInTime(),now).toMinutes();row.setWorkingMinutes(mins);
        row.setWorkingHours(Math.round(mins/60.0*100.0)/100.0);
        row.setOvertimeMinutes(Math.max(0,mins-settings.getInt("MIN_WORK_MINUTES",480)));
        if(!approvedWfh&&mins<Math.max(1,settings.getInt("MIN_WORK_MINUTES",480)/2))row.setStatus(Attendance.AttendanceStatus.HALF_DAY);
        if(isGeofenceEnabled()&&!approvedWfh){
            row.setCheckOutLatitude(location.getLatitude());
            row.setCheckOutLongitude(location.getLongitude());
            row.setCheckOutAccuracy(location.getAccuracy());
            row.setCheckOutDistanceMeters(v.distanceMeters());
            row.setCheckOutLocationVerified(true);
        }
        return attendanceRepository.save(row);}
    public Attendance markWorkFromHome(String employeeId){
        Employee emp=employee(employeeId);ensureAttendanceAvailable();ensureCheckInAvailable();LocalDate d=settings.today();if(holidays.isHoliday(d))throw new IllegalStateException("Today is an organization holiday. Work-from-home attendance is not required.");if(!isApprovedWorkFromHome(emp,d))throw new IllegalStateException("Work from home must be approved through Leave Management before attendance can be marked without geofencing");Attendance row=attendanceRepository.findByEmployeeAndWorkDate(emp,d).orElse(new Attendance());if(row.getCheckInTime()!=null)throw new IllegalStateException("Attendance already started today");row.setEmployee(emp);row.setWorkDate(d);row.setCheckInTime(settings.now());row.setStatus(Attendance.AttendanceStatus.WORK_FROM_HOME);return attendanceRepository.save(row);}
    public Attendance markWorkFromHomeCheckout(String employeeId){return checkOut(employeeId,null);}
    private void ensureAttendanceAvailable(){if(!settings.getBoolean("ATTENDANCE_ENABLED",true))throw new IllegalStateException("Attendance has been disabled by your organization administrator.");}
    private void ensureCheckInAvailable(){if(!settings.getBoolean("CHECK_IN_ENABLED",true))throw new IllegalStateException("Check-in is currently disabled by your organization administrator.");}
    private void ensureCheckOutAvailable(){if(!settings.getBoolean("CHECK_OUT_ENABLED",true))throw new IllegalStateException("Check-out is currently disabled by your organization administrator.");}
    private boolean isApprovedWorkFromHome(Employee e,LocalDate d){return leaveRequestRepository.findByEmployeeEmployeeIdOrderByCreatedAtDesc(e.getEmployeeId()).stream().anyMatch(r->r.getStatus()==LeaveStatus.APPROVED&&"WORK_FROM_HOME".equalsIgnoreCase(r.getLeaveType())&&r.getStartDate()!=null&&r.getEndDate()!=null&&!d.isBefore(r.getStartDate())&&!d.isAfter(r.getEndDate()));}
    private LocationVerification verifyLocation(AttendanceLocationRequest l){if(l==null||l.getLatitude()==null||l.getLongitude()==null||l.getAccuracy()==null)throw new IllegalArgumentException("Current location is required for attendance");if(!Double.isFinite(l.getLatitude())||!Double.isFinite(l.getLongitude())||!Double.isFinite(l.getAccuracy()))throw new IllegalArgumentException("Invalid location data");double maxAcc=settings.getInt("MAX_GPS_ACCURACY",100);if(l.getAccuracy()>maxAcc)throw new IllegalArgumentException("GPS accuracy is too low ("+Math.round(l.getAccuracy())+"m)");List<OfficeLocation> offices=officeLocationRepository.findByActiveTrue();double nearest=Double.MAX_VALUE;for(OfficeLocation o:offices){if(o.getLatitude()==null||o.getLongitude()==null)continue;double d=distance(l.getLatitude(),l.getLongitude(),o.getLatitude(),o.getLongitude());nearest=Math.min(nearest,d);double officeRadius=o.getRadiusMeters()!=null&&o.getRadiusMeters()>0?o.getRadiusMeters():getAllowedRadiusMeters(); if(d<=officeRadius)return new LocationVerification(d);}if(nearest<Double.MAX_VALUE)throw new IllegalArgumentException("You are outside all active office geofences. Nearest office: "+Math.round(nearest)+"m");throw new IllegalArgumentException("No active office geofence is configured.");}
    private double distance(double a,double b,double c,double d){double dl=Math.toRadians(c-a),dn=Math.toRadians(d-b);double x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(Math.toRadians(a))*Math.cos(Math.toRadians(c))*Math.sin(dn/2)*Math.sin(dn/2);return EARTH_RADIUS_METERS*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
    private record LocationVerification(double distanceMeters){}
    public List<Attendance> getMyHistory(String id){return attendanceRepository.findByEmployeeOrderByWorkDateDesc(employee(id));}
    public Attendance getMyToday(String id){return attendanceRepository.findByEmployeeAndWorkDate(employee(id),settings.today()).orElse(null);}
    public List<Attendance> getAllAttendance(){return attendanceRepository.findAllByOrderByWorkDateDescCheckInTimeDesc();}
    public List<Attendance> getTodayAttendance(){return attendanceRepository.findByWorkDateOrderByCheckInTimeDesc(settings.today());}
}
