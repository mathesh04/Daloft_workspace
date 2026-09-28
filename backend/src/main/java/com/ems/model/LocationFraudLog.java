package com.ems.model;

import java.time.LocalDateTime;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "location_fraud_logs")
public class LocationFraudLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Employee employee;

    @Column(name = "event_type", nullable = false, length = 20)
    private String eventType;

    @Column(name = "fraud_type", nullable = false, length = 40)
    private String fraudType;

    @Column(nullable = false, length = 10)
    private String severity;

    @Column(name = "gps_latitude")
    private Double gpsLatitude;

    @Column(name = "gps_longitude")
    private Double gpsLongitude;

    @Column(name = "gps_accuracy")
    private Double gpsAccuracy;

    @Column(name = "client_ip", length = 45)
    private String clientIp;

    @Column(name = "ip_latitude")
    private Double ipLatitude;

    @Column(name = "ip_longitude")
    private Double ipLongitude;

    @Column(name = "ip_city", length = 100)
    private String ipCity;

    @Column(name = "ip_country", length = 100)
    private String ipCountry;

    @Column(name = "ip_gps_distance_km")
    private Double ipGpsDistanceKm;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(length = 1024)
    private String details;

    @Column(nullable = false)
    private boolean reviewed = false;

    @Column(name = "admin_notes", length = 1024)
    private String adminNotes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public LocationFraudLog() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Employee getEmployee() {
        return employee;
    }

    public void setEmployee(Employee employee) {
        this.employee = employee;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getFraudType() {
        return fraudType;
    }

    public void setFraudType(String fraudType) {
        this.fraudType = fraudType;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public Double getGpsLatitude() {
        return gpsLatitude;
    }

    public void setGpsLatitude(Double gpsLatitude) {
        this.gpsLatitude = gpsLatitude;
    }

    public Double getGpsLongitude() {
        return gpsLongitude;
    }

    public void setGpsLongitude(Double gpsLongitude) {
        this.gpsLongitude = gpsLongitude;
    }

    public Double getGpsAccuracy() {
        return gpsAccuracy;
    }

    public void setGpsAccuracy(Double gpsAccuracy) {
        this.gpsAccuracy = gpsAccuracy;
    }

    public String getClientIp() {
        return clientIp;
    }

    public void setClientIp(String clientIp) {
        this.clientIp = clientIp;
    }

    public Double getIpLatitude() {
        return ipLatitude;
    }

    public void setIpLatitude(Double ipLatitude) {
        this.ipLatitude = ipLatitude;
    }

    public Double getIpLongitude() {
        return ipLongitude;
    }

    public void setIpLongitude(Double ipLongitude) {
        this.ipLongitude = ipLongitude;
    }

    public String getIpCity() {
        return ipCity;
    }

    public void setIpCity(String ipCity) {
        this.ipCity = ipCity;
    }

    public String getIpCountry() {
        return ipCountry;
    }

    public void setIpCountry(String ipCountry) {
        this.ipCountry = ipCountry;
    }

    public Double getIpGpsDistanceKm() {
        return ipGpsDistanceKm;
    }

    public void setIpGpsDistanceKm(Double ipGpsDistanceKm) {
        this.ipGpsDistanceKm = ipGpsDistanceKm;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public boolean isReviewed() {
        return reviewed;
    }

    public void setReviewed(boolean reviewed) {
        this.reviewed = reviewed;
    }

    public String getAdminNotes() {
        return adminNotes;
    }

    public void setAdminNotes(String adminNotes) {
        this.adminNotes = adminNotes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
