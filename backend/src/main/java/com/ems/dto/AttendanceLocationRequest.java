package com.ems.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public class AttendanceLocationRequest {

    @NotNull
    @DecimalMin(value = "-90.0")
    @DecimalMax(value = "90.0")
    private Double latitude;

    @NotNull
    @DecimalMin(value = "-180.0")
    @DecimalMax(value = "180.0")
    private Double longitude;

    @NotNull
    @DecimalMin(value = "0.0")
    private Double accuracy;

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getAccuracy() { return accuracy; }
    public void setAccuracy(Double accuracy) { this.accuracy = accuracy; }

    private Boolean mockDetected;
    private Long locationTimestamp;
    private Double altitude;
    private Double altitudeAccuracy;
    private Double heading;
    private Double speed;

    public Boolean getMockDetected() { return mockDetected; }
    public void setMockDetected(Boolean mockDetected) { this.mockDetected = mockDetected; }

    public Long getLocationTimestamp() { return locationTimestamp; }
    public void setLocationTimestamp(Long locationTimestamp) { this.locationTimestamp = locationTimestamp; }

    public Double getAltitude() { return altitude; }
    public void setAltitude(Double altitude) { this.altitude = altitude; }

    public Double getAltitudeAccuracy() { return altitudeAccuracy; }
    public void setAltitudeAccuracy(Double altitudeAccuracy) { this.altitudeAccuracy = altitudeAccuracy; }

    public Double getHeading() { return heading; }
    public void setHeading(Double heading) { this.heading = heading; }

    public Double getSpeed() { return speed; }
    public void setSpeed(Double speed) { this.speed = speed; }
}
