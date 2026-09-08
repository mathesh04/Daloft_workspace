package com.ems.controller;

import com.ems.dto.AttendanceLocationRequest;
import com.ems.model.Attendance;
import com.ems.service.AttendanceService;
import com.ems.service.AttendanceRegularizationService;
import com.ems.model.AttendanceRegularizationRequest;
import java.time.LocalDateTime;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class AttendanceController {

    private final AttendanceService attendanceService; private final AttendanceRegularizationService regularization;

    public AttendanceController(AttendanceService attendanceService, AttendanceRegularizationService regularization) {
        this.attendanceService = attendanceService; this.regularization = regularization;
    }

    @GetMapping("/api/attendance/geofence-config")
    public ResponseEntity<?> geofenceConfig() {
        return ResponseEntity.ok(Map.of(
                 "enabled", attendanceService.isGeofenceEnabled(),
                "radiusMeters", attendanceService.getAllowedRadiusMeters(),
                "attendanceEnabled", attendanceService.isAttendanceEnabled(),
                "checkInEnabled", attendanceService.isCheckInEnabled(),
                "checkOutEnabled", attendanceService.isCheckOutEnabled()
        ));
    }

    @PostMapping("/api/attendance/check-in")
    public ResponseEntity<?> checkIn(Authentication auth, @Valid @RequestBody(required = false) AttendanceLocationRequest location) {
        try {
            return ResponseEntity.ok(attendanceService.checkIn(auth.getName(), location));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/api/attendance/check-out")
    public ResponseEntity<?> checkOut(Authentication auth, @Valid @RequestBody(required = false) AttendanceLocationRequest location) {
        try {
            return ResponseEntity.ok(attendanceService.checkOut(auth.getName(), location));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/api/attendance/work-from-home")
    public ResponseEntity<?> workFromHome(Authentication auth) {
        try { return ResponseEntity.ok(attendanceService.markWorkFromHome(auth.getName())); }
        catch (IllegalStateException | IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }

    @PostMapping("/api/attendance/work-from-home/check-out")
    public ResponseEntity<?> workFromHomeCheckout(Authentication auth) {
        try { return ResponseEntity.ok(attendanceService.markWorkFromHomeCheckout(auth.getName())); }
        catch (IllegalStateException | IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
    }

    @GetMapping("/api/attendance/me")
    public List<Attendance> myHistory(Authentication auth) {
        return attendanceService.getMyHistory(auth.getName());
    }

    @GetMapping("/api/attendance/me/today")
    public ResponseEntity<?> myToday(Authentication auth) {
        Attendance a = attendanceService.getMyToday(auth.getName());
        return ResponseEntity.ok(a);
    }



    @GetMapping("/api/attendance/regularization/me")
    public List<AttendanceRegularizationRequest> myRegularizations(Authentication auth){ return regularization.my(auth.getName()); }

    @PostMapping("/api/attendance/regularization")
    public ResponseEntity<?> createRegularization(Authentication auth,@RequestBody Map<String,Object> body){
        try{
            Long attendanceId=body.get("attendanceId")==null?null:Long.valueOf(String.valueOf(body.get("attendanceId")));
            LocalDateTime in=body.get("requestedCheckIn")==null||String.valueOf(body.get("requestedCheckIn")).isBlank()?null:LocalDateTime.parse(String.valueOf(body.get("requestedCheckIn")));
            LocalDateTime out=body.get("requestedCheckOut")==null||String.valueOf(body.get("requestedCheckOut")).isBlank()?null:LocalDateTime.parse(String.valueOf(body.get("requestedCheckOut")));
            return ResponseEntity.status(201).body(regularization.create(auth.getName(),attendanceId,in,out,String.valueOf(body.getOrDefault("reason","")),auth));
        }catch(Exception e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()));}
    }

    @GetMapping("/api/admin/attendance-corrections")
    public List<AttendanceRegularizationRequest> allRegularizations(){ return regularization.all(); }

    @PutMapping("/api/admin/attendance-corrections/{id}/status")
    public ResponseEntity<?> adminRegularizationStatus(@PathVariable Long id,@RequestBody Map<String,String> body,Authentication auth){
        try{return ResponseEntity.ok(regularization.adminReview(id,body.get("status"),body.get("reason"),auth));}
        catch(Exception e){return ResponseEntity.status(e instanceof SecurityException?403:400).body(Map.of("message",e.getMessage()));}
    }

    @GetMapping("/api/admin/attendance")
    public List<Attendance> allAttendance() {
        return attendanceService.getAllAttendance();
    }

    @GetMapping("/api/admin/attendance/today")
    public List<Attendance> todayAttendance() {
        return attendanceService.getTodayAttendance();
    }
}
