package com.ems.controller;

import com.ems.model.Announcement;
import com.ems.service.AnnouncementService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class AnnouncementController {

    private final AnnouncementService announcementService;

    public AnnouncementController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    /** Visible to every logged-in employee. */
    @GetMapping("/api/announcements")
    public List<Announcement> getAll() {
        return announcementService.getAll();
    }

    /** HR Admin only. */
    @PostMapping("/api/admin/announcements")
    public ResponseEntity<?> create(@RequestBody Map<String, String> body, Authentication auth) {
        String title = body.get("title");
        String message = body.get("message");
        try {
            return ResponseEntity.ok(announcementService.create(title, message, auth.getName()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Announcement could not be saved because the database schema is not synchronized. Restart the backend so the latest Flyway migration can run."));
        }
    }

    /** HR Admin only. */
    @DeleteMapping("/api/admin/announcements/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            announcementService.delete(id);
            return ResponseEntity.ok(Map.of("message", "Announcement removed"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
