package com.ems.controller;

import com.ems.model.Notification;
import com.ems.repository.NotificationRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationRepository repo;

    NotificationController(NotificationRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/me")
    public List<Notification> me(Authentication authentication, @RequestParam(required=false) String category, @RequestParam(required=false) String priority, @RequestParam(required=false) Boolean unreadOnly) {
        return repo.findByEmployeeEmployeeIdOrderByCreatedAtDesc(authentication.getName()).stream().filter(n->category==null||category.isBlank()||category.equalsIgnoreCase(n.getCategory())).filter(n->priority==null||priority.isBlank()||priority.equalsIgnoreCase(n.getPriority())).filter(n->unreadOnly==null||!unreadOnly||!n.isReadStatus()).toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Long> count(Authentication authentication) {
        return Map.of("count",
                repo.countByEmployeeEmployeeIdAndReadStatusFalse(authentication.getName()));
    }

    @PutMapping("/{id}/read")
    public Notification read(@PathVariable Long id, Authentication authentication) {
        Notification notification = repo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Notification not found"));

        if (!notification.getEmployee().getEmployeeId().equals(authentication.getName())) {
            throw new SecurityException("Not allowed");
        }

        notification.setReadStatus(true);
        return repo.save(notification);
    }

    @DeleteMapping("/{id}")
    public Map<String,Object> delete(@PathVariable Long id, Authentication authentication) { Notification n=repo.findById(id).orElseThrow(()->new NoSuchElementException("Notification not found")); if(!n.getEmployee().getEmployeeId().equals(authentication.getName())) throw new SecurityException("Not allowed"); repo.delete(n); return Map.of("success",true); }

    @PutMapping("/read-all")
    public Map<String, Object> readAll(Authentication authentication) {
        List<Notification> notifications =
                repo.findByEmployeeEmployeeIdOrderByCreatedAtDesc(authentication.getName());

        notifications.forEach(notification -> notification.setReadStatus(true));
        repo.saveAll(notifications);

        return Map.of("success", true, "updated", notifications.size());
    }
}
