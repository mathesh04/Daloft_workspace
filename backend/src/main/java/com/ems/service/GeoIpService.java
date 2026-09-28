package com.ems.service;

import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GeoIpService {

    private static final double EARTH_RADIUS_KM = 6_371.0;
    private static final java.util.Set<String> PRIVATE_PREFIXES = java.util.Set.of(
            "127.", "10.", "192.168.", "0:0:0:0:0:0:0:1", "::1", "0.0.0.0"
    );

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Map<String, CachedResult> cache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 300_000; // 5 minutes

    public GeoIpService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public GeoIpResult lookup(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) return null;
        if (isPrivateIp(ipAddress)) return null;

        
        CachedResult cached = cache.get(ipAddress);
        if (cached != null && System.currentTimeMillis() - cached.timestamp < CACHE_TTL_MS) {
            return cached.result;
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://ip-api.com/json/" + ipAddress + "?fields=status,country,city,lat,lon,query"))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) return null;

            JsonNode json = objectMapper.readTree(response.body());
            if (!"success".equals(json.path("status").asText())) return null;

            GeoIpResult result = new GeoIpResult(
                    json.path("lat").asDouble(),
                    json.path("lon").asDouble(),
                    json.path("city").asText(""),
                    json.path("country").asText("")
            );

            cache.put(ipAddress, new CachedResult(result, System.currentTimeMillis()));
            return result;
        } catch (Exception e) {
           
            return null;
        }
    }

    public double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private boolean isPrivateIp(String ip) {
        if (ip == null) return true;
        String trimmed = ip.trim();
        for (String prefix : PRIVATE_PREFIXES) {
            if (trimmed.startsWith(prefix)) return true;
        }
        
        if (trimmed.startsWith("172.")) {
            try {
                int second = Integer.parseInt(trimmed.split("\\.")[1]);
                if (second >= 16 && second <= 31) return true;
            } catch (Exception ignored) {}
        }
        return false;
    }

    public record GeoIpResult(double latitude, double longitude, String city, String country) {}
    private record CachedResult(GeoIpResult result, long timestamp) {}
}
