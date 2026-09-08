package com.ems.service;

import com.ems.model.Announcement;
import com.ems.model.Employee;
import com.ems.repository.AnnouncementRepository;
import com.ems.repository.EmployeeRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final EmployeeRepository employeeRepository;

    public AnnouncementService(AnnouncementRepository announcementRepository, EmployeeRepository employeeRepository) {
        this.announcementRepository = announcementRepository;
        this.employeeRepository = employeeRepository;
    }

    public List<Announcement> getAll() {
        return announcementRepository.findAllByOrderByCreatedAtDesc();
    }

    public Announcement create(String title, String message, String postedByEmployeeId) {
        String cleanTitle = title == null ? "" : title.trim();
        String cleanMessage = message == null ? "" : message.trim();
        if (cleanTitle.isBlank() || cleanMessage.isBlank()) {
            throw new IllegalArgumentException("Title and message are required");
        }
        if (cleanTitle.length() > 255) {
            throw new IllegalArgumentException("Title must be 255 characters or fewer");
        }
        if (cleanMessage.length() > 2000) {
            throw new IllegalArgumentException("Message must be 2000 characters or fewer");
        }

        Employee poster = employeeRepository.findByEmployeeId(postedByEmployeeId)
                .orElseThrow(() -> new IllegalStateException("Authenticated administrator account was not found"));

        Announcement a = new Announcement();
        a.setTitle(cleanTitle);
        a.setMessage(cleanMessage);
        a.setTargetType("ALL");
        a.setPostedBy(poster);
        return announcementRepository.save(a);
    }

    public void delete(Long id) {
        if (!announcementRepository.existsById(id)) {
            throw new IllegalArgumentException("Announcement not found");
        }
        announcementRepository.deleteById(id);
    }
}
