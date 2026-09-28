package com.ems.service;

import com.ems.dto.AttendanceLocationRequest;
import com.ems.model.Employee;
import com.ems.model.LocationFraudLog;
import com.ems.repository.LocationFraudLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationFraudService {

    private final LocationFraudLogRepository repository;
    private final SystemSettingsService settings;

    public LocationFraudService(LocationFraudLogRepository repository, SystemSettingsService settings) {
        this.repository = repository;
        this.settings = settings;
    }

    public LocationFraudLog log(Employee employee, String eventType, String fraudType,
                                String severity, AttendanceLocationRequest gps,
                                String clientIp, GeoIpService.GeoIpResult ipGeo,
                                double ipGpsDistanceKm, String userAgent, String details) {
        LocationFraudLog entry = new LocationFraudLog();
        entry.setEmployee(employee);
        entry.setEventType(eventType);
        entry.setFraudType(fraudType);
        entry.setSeverity(severity);
        entry.setCreatedAt(settings.now());

        if (gps != null) {
            entry.setGpsLatitude(gps.getLatitude());
            entry.setGpsLongitude(gps.getLongitude());
            entry.setGpsAccuracy(gps.getAccuracy());
        }

        entry.setClientIp(clientIp);

        if (ipGeo != null) {
            entry.setIpLatitude(ipGeo.latitude());
            entry.setIpLongitude(ipGeo.longitude());
            entry.setIpCity(ipGeo.city());
            entry.setIpCountry(ipGeo.country());
        }

        entry.setIpGpsDistanceKm(ipGpsDistanceKm);
        entry.setUserAgent(userAgent != null && userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent);
        entry.setDetails(details != null && details.length() > 1024 ? details.substring(0, 1024) : details);

        return repository.save(entry);
    }

    public List<LocationFraudLog> all() {
        return repository.findAllByOrderByCreatedAtDesc();
    }

    public List<LocationFraudLog> unreviewed() {
        return repository.findByReviewedFalseOrderByCreatedAtDesc();
    }

    public long unreviewedCount() {
        return repository.countByReviewedFalse();
    }

    public List<LocationFraudLog> byEmployee(String employeeId) {
        return repository.findByEmployeeEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    public LocationFraudLog review(Long id, String adminNotes) {
        LocationFraudLog entry = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Fraud log not found"));
        entry.setReviewed(true);
        entry.setAdminNotes(adminNotes);
        return repository.save(entry);
    }
}
