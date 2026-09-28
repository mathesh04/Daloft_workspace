package com.ems.controller;

import com.ems.model.LocationFraudLog;
import com.ems.service.LocationFraudService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system-admin/location-fraud")
public class LocationFraudController {

    private final LocationFraudService fraudService;

    public LocationFraudController(LocationFraudService fraudService) {
        this.fraudService = fraudService;
    }

    @GetMapping
    public List<LocationFraudLog> all() {
        return fraudService.all();
    }

    @GetMapping("/unreviewed")
    public ResponseEntity<?> unreviewedCount() {
        return ResponseEntity.ok(Map.of("count", fraudService.unreviewedCount()));
    }

    @GetMapping("/unreviewed/list")
    public List<LocationFraudLog> unreviewedList() {
        return fraudService.unreviewed();
    }

    @GetMapping("/employee/{employeeId}")
    public List<LocationFraudLog> byEmployee(@PathVariable String employeeId) {
        return fraudService.byEmployee(employeeId);
    }

    @PutMapping("/{id}/review")
    public ResponseEntity<?> review(@PathVariable Long id, @RequestBody Map<String, String> body) {
        try {
            return ResponseEntity.ok(fraudService.review(id, body.get("adminNotes")));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
