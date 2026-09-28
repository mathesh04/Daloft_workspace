package com.ems.service;

import com.ems.dto.AttendanceLocationRequest;
import com.ems.model.*;
import com.ems.repository.*;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.List;

@Service
public class AttendanceService {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;
    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final OfficeLocationRepository officeLocationRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final SystemSettingsService settings;
    private final HolidayService holidays;
    private final GeoIpService geoIpService;
    private final LocationFraudService fraudService;

    public AttendanceService(AttendanceRepository a, EmployeeRepository e, OfficeLocationRepository o, LeaveRequestRepository l, SystemSettingsService s, HolidayService h, GeoIpService g, LocationFraudService f) {
        attendanceRepository = a;
        employeeRepository = e;
        officeLocationRepository = o;
        leaveRequestRepository = l;
        settings = s;
        holidays = h;
        geoIpService = g;
        fraudService = f;
    }

    private Employee employee(String id) {
        Employee e = employeeRepository.findByEmployeeId(id).orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        if (e.getRole() == Role.SYSTEM_ADMIN) {
            throw new IllegalStateException("Organization Admin accounts do not participate in employee attendance.");
        }
        return e;
    }

    public boolean isGeofenceEnabled() {
        return settings.getBoolean("GEOFENCE_ENABLED", false);
    }

    public double getAllowedRadiusMeters() {
        return settings.getInt("GEOFENCE_RADIUS", 100);
    }

    public boolean isAttendanceEnabled() {
        return settings.getBoolean("ATTENDANCE_ENABLED", true);
    }

    public boolean isCheckInEnabled() {
        return settings.getBoolean("CHECK_IN_ENABLED", true);
    }

    public boolean isCheckOutEnabled() {
        return settings.getBoolean("CHECK_OUT_ENABLED", true);
    }

    public Attendance checkIn(String employeeId, AttendanceLocationRequest location, String clientIp, String userAgent) {
        Employee emp = employee(employeeId);
        ensureAttendanceAvailable();
        ensureCheckInAvailable();
        LocalDate today = settings.today();
        if (holidays.isHoliday(today)) {
            throw new IllegalStateException("Today is an organization holiday. Attendance check-in is not required.");
        }
        Attendance row = attendanceRepository.findByEmployeeAndWorkDate(emp, today).orElse(null);
        if (row != null && row.getCheckInTime() != null) {
            throw new IllegalStateException("Already checked in today at " + row.getCheckInTime());
        }
        boolean approvedWfh = isApprovedWorkFromHome(emp, today);
        LocationVerification v = (isGeofenceEnabled() && !approvedWfh) ? verifyLocation(location, clientIp, userAgent, emp, "CHECK_IN") : new LocationVerification(0);
        if (row == null) {
            row = new Attendance();
        }
        row.setEmployee(emp);
        row.setWorkDate(today);
        LocalDateTime now = settings.now();
        row.setCheckInTime(now);
        if (isGeofenceEnabled() && !approvedWfh) {
            row.setCheckInLatitude(location.getLatitude());
            row.setCheckInLongitude(location.getLongitude());
            row.setCheckInAccuracy(location.getAccuracy());
            row.setCheckInDistanceMeters(v.distanceMeters());
            row.setCheckInLocationVerified(true);
        }
        LocalTime start = LocalTime.parse(settings.getString("WORK_START_TIME", "09:00"));
        LocalTime cutoff = start.plusMinutes(settings.getInt("LATE_GRACE_MINUTES", 10));
        row.setStatus(approvedWfh ? Attendance.AttendanceStatus.WORK_FROM_HOME : (now.toLocalTime().isAfter(cutoff) ? Attendance.AttendanceStatus.LATE : Attendance.AttendanceStatus.PRESENT));
        return attendanceRepository.save(row);
    }

    public Attendance checkOut(String employeeId, AttendanceLocationRequest location, String clientIp, String userAgent) {
        Employee emp = employee(employeeId);
        ensureAttendanceAvailable();
        ensureCheckOutAvailable();
        Attendance row = attendanceRepository.findByEmployeeAndWorkDate(emp, settings.today()).orElseThrow(() -> new IllegalStateException("You must check in before checking out"));
        if (row.getCheckOutTime() != null) {
            throw new IllegalStateException("Already checked out today at " + row.getCheckOutTime());
        }
        boolean approvedWfh = isApprovedWorkFromHome(emp, settings.today());
        LocationVerification v = (isGeofenceEnabled() && !approvedWfh) ? verifyLocation(location, clientIp, userAgent, emp, "CHECK_OUT") : new LocationVerification(0);
        LocalDateTime now = settings.now();
        row.setCheckOutTime(now);
        long mins = Duration.between(row.getCheckInTime(), now).toMinutes();
        row.setWorkingMinutes(mins);
        row.setWorkingHours(Math.round(mins / 60.0 * 100.0) / 100.0);
        row.setOvertimeMinutes(Math.max(0, mins - settings.getInt("MIN_WORK_MINUTES", 480)));
        if (!approvedWfh && mins < Math.max(1, settings.getInt("MIN_WORK_MINUTES", 480) / 2)) {
            row.setStatus(Attendance.AttendanceStatus.HALF_DAY);
        }
        if (isGeofenceEnabled() && !approvedWfh) {
            row.setCheckOutLatitude(location.getLatitude());
            row.setCheckOutLongitude(location.getLongitude());
            row.setCheckOutAccuracy(location.getAccuracy());
            row.setCheckOutDistanceMeters(v.distanceMeters());
            row.setCheckOutLocationVerified(true);
        }
        return attendanceRepository.save(row);
    }

    public Attendance markWorkFromHome(String employeeId) {
        Employee emp = employee(employeeId);
        ensureAttendanceAvailable();
        ensureCheckInAvailable();
        LocalDate d = settings.today();
        if (holidays.isHoliday(d)) {
            throw new IllegalStateException("Today is an organization holiday. Work-from-home attendance is not required.");
        
        }if (!isApprovedWorkFromHome(emp, d)) {
            throw new IllegalStateException("Work from home must be approved through Leave Management before attendance can be marked without geofencing");
        
        }Attendance row = attendanceRepository.findByEmployeeAndWorkDate(emp, d).orElse(new Attendance());
        if (row.getCheckInTime() != null) {
            throw new IllegalStateException("Attendance already started today");
        
        }row.setEmployee(emp);
        row.setWorkDate(d);
        row.setCheckInTime(settings.now());
        row.setStatus(Attendance.AttendanceStatus.WORK_FROM_HOME);
        return attendanceRepository.save(row);
    }

    public Attendance markWorkFromHomeCheckout(String employeeId) {
        return checkOut(employeeId, null, null, null);
    }

    private void ensureAttendanceAvailable() {
        if (!settings.getBoolean("ATTENDANCE_ENABLED", true)) {
            throw new IllegalStateException("Attendance has been disabled by your organization administrator.");
    
        }}

    private void ensureCheckInAvailable() {
        if (!settings.getBoolean("CHECK_IN_ENABLED", true)) {
            throw new IllegalStateException("Check-in is currently disabled by your organization administrator.");
    
        }}

    private void ensureCheckOutAvailable() {
        if (!settings.getBoolean("CHECK_OUT_ENABLED", true)) {
            throw new IllegalStateException("Check-out is currently disabled by your organization administrator.");
    
        }}

    private boolean isApprovedWorkFromHome(Employee e, LocalDate d) {
        return leaveRequestRepository.findByEmployeeEmployeeIdOrderByCreatedAtDesc(e.getEmployeeId()).stream().anyMatch(r -> r.getStatus() == LeaveStatus.APPROVED && "WORK_FROM_HOME".equalsIgnoreCase(r.getLeaveType()) && r.getStartDate() != null && r.getEndDate() != null && !d.isBefore(r.getStartDate()) && !d.isAfter(r.getEndDate()));
    }

    private LocationVerification verifyLocation(AttendanceLocationRequest l, String clientIp, String userAgent, Employee employee, String eventType) {
        if (l == null || l.getLatitude() == null || l.getLongitude() == null || l.getAccuracy() == null) {
            throw new IllegalArgumentException("Current location is required for attendance");
        }
        if (!Double.isFinite(l.getLatitude()) || !Double.isFinite(l.getLongitude()) || !Double.isFinite(l.getAccuracy())) {
            throw new IllegalArgumentException("Invalid location data");
        }
        double maxAcc = settings.getInt("MAX_GPS_ACCURACY", 100);
        if (l.getAccuracy() > maxAcc) {
            throw new IllegalArgumentException("GPS accuracy is too low (" + Math.round(l.getAccuracy()) + "m)");
        }

        // --- LAYER: Mock Location Detection ---
        if (Boolean.TRUE.equals(l.getMockDetected())) {
            fraudService.log(employee, eventType, "MOCK_DETECTED", "CRITICAL", l, clientIp, null, 0, userAgent,
                    "Client reported mock/fake location signal");
            if (settings.getBoolean("GEOFENCE_BLOCK_MOCK", true)) {
                throw new IllegalArgumentException("Mock/fake location detected. Please disable any location spoofing tools and try again.");
            }
        }

        // --- LAYER: Server-side mock heuristic (high accuracy but no altitude) ---
        if (l.getAltitude() == null && l.getAltitudeAccuracy() == null && l.getAccuracy() != null && l.getAccuracy() < 20) {
            fraudService.log(employee, eventType, "MOCK_HEURISTIC", "MEDIUM", l, clientIp, null, 0, userAgent,
                    "High GPS accuracy (" + String.format("%.1f", l.getAccuracy()) + "m) but no altitude data — possible mock location");
        }

        // --- LAYER: Suspicious accuracy (too perfect) ---
        if (l.getAccuracy() != null && l.getAccuracy() < 1.0) {
            fraudService.log(employee, eventType, "SUSPICIOUS_ACCURACY", "MEDIUM", l, clientIp, null, 0, userAgent,
                    "GPS accuracy suspiciously precise: " + l.getAccuracy() + "m");
        }

        // --- LAYER: IP Geolocation Cross-Check ---
        if (settings.getBoolean("GEOFENCE_IP_CHECK_ENABLED", true)) {
            try {
                GeoIpService.GeoIpResult ipGeo = geoIpService.lookup(clientIp);
                if (ipGeo != null) {
                    double ipGpsDistanceKm = geoIpService.distanceKm(l.getLatitude(), l.getLongitude(), ipGeo.latitude(), ipGeo.longitude());
                    double maxMismatchKm = settings.getInt("MAX_IP_GPS_MISMATCH_KM", 100);
                    if (ipGpsDistanceKm > maxMismatchKm) {
                        fraudService.log(employee, eventType, "IP_GPS_MISMATCH", "HIGH", l, clientIp, ipGeo, ipGpsDistanceKm, userAgent,
                                "GPS location " + Math.round(ipGpsDistanceKm) + "km from IP location (" + ipGeo.city() + ", " + ipGeo.country() + ")");
                        if (settings.getBoolean("GEOFENCE_BLOCK_IP_MISMATCH", false)) {
                            throw new IllegalArgumentException("Location verification failed. Your network location doesn't match your GPS position.");
                        }
                    }
                }
            } catch (IllegalArgumentException ex) {
                throw ex;
            } catch (Exception ignored) {
            }
        }

        // --- LAYER: Teleportation Detection ---
        if (settings.getBoolean("GEOFENCE_TELEPORTATION_CHECK", true)) {
            try {
                List<Attendance> recent = attendanceRepository.findByEmployeeOrderByWorkDateDesc(employee);
                Attendance last = recent.isEmpty() ? null : recent.get(0);
                if (last != null) {
                    Double lastLat = last.getCheckOutLatitude() != null ? last.getCheckOutLatitude() : last.getCheckInLatitude();
                    Double lastLng = last.getCheckOutLongitude() != null ? last.getCheckOutLongitude() : last.getCheckInLongitude();
                    java.time.LocalDateTime lastTime = last.getCheckOutTime() != null ? last.getCheckOutTime() : last.getCheckInTime();
                    if (lastLat != null && lastLng != null && lastTime != null) {
                        double distKm = geoIpService.distanceKm(l.getLatitude(), l.getLongitude(), lastLat, lastLng);
                        long minutesSince = Duration.between(lastTime, settings.now()).toMinutes();
                        double maxPossibleKm = Math.max(50, (minutesSince / 60.0) * 900);
                        if (distKm > maxPossibleKm) {
                            fraudService.log(employee, eventType, "TELEPORTATION", "CRITICAL", l, clientIp, null, distKm, userAgent,
                                    "Moved " + Math.round(distKm) + "km in " + minutesSince + " minutes (physically impossible)");
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        // --- Original office geofence check ---
        List<OfficeLocation> offices = officeLocationRepository.findByActiveTrue();
        double nearest = Double.MAX_VALUE;
        for (OfficeLocation o : offices) {
            if (o.getLatitude() == null || o.getLongitude() == null) {
                continue;
            }
            double d = distance(l.getLatitude(), l.getLongitude(), o.getLatitude(), o.getLongitude());
            nearest = Math.min(nearest, d);
            double officeRadius = o.getRadiusMeters() != null && o.getRadiusMeters() > 0 ? o.getRadiusMeters() : getAllowedRadiusMeters();
            if (d <= officeRadius) {
                return new LocationVerification(d);
            }
        }
        if (nearest < Double.MAX_VALUE) {
            throw new IllegalArgumentException("You are outside all active office geofences. Nearest office: " + Math.round(nearest) + "m");
        }
        throw new IllegalArgumentException("No active office geofence is configured.");
    }

    private double distance(double a, double b, double c, double d) {
        double dl = Math.toRadians(c - a), dn = Math.toRadians(d - b);
        double x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(Math.toRadians(a)) * Math.cos(Math.toRadians(c)) * Math.sin(dn / 2) * Math.sin(dn / 2);
        return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }

    private record LocationVerification(double distanceMeters) {

    }

    public List<Attendance> getMyHistory(String id) {
        return attendanceRepository.findByEmployeeOrderByWorkDateDesc(employee(id));
    }

    public Attendance getMyToday(String id) {
        return attendanceRepository.findByEmployeeAndWorkDate(employee(id), settings.today()).orElse(null);
    }

    public List<Attendance> getAllAttendance() {
        return attendanceRepository.findAllByOrderByWorkDateDescCheckInTimeDesc();
    }

    public List<Attendance> getTodayAttendance() {
        return attendanceRepository.findByWorkDateOrderByCheckInTimeDesc(settings.today());
    }
}
