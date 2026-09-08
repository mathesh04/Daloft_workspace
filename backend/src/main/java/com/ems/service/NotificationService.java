package com.ems.service;

import com.ems.model.Employee;
import com.ems.model.Notification;
import com.ems.repository.NotificationRepository;
import com.ems.repository.EmployeeRepository;
import com.ems.model.Role;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository repository;
    private final BrevoEmailService emailService;
    private final EmployeeRepository employeeRepository;

    public NotificationService(NotificationRepository repository, BrevoEmailService emailService, EmployeeRepository employeeRepository) {
        this.repository = repository;
        this.emailService = emailService;
        this.employeeRepository = employeeRepository;
    }


    @Transactional
    public void notifyAdmins(String title, String message, String type) {
        List<Employee> admins = new java.util.ArrayList<>();
        admins.addAll(employeeRepository.findByRole(Role.HR_ADMIN));
        admins.addAll(employeeRepository.findByRole(Role.SYSTEM_ADMIN));
        if (admins.isEmpty()) {
            log.warn("No HR_ADMIN employee found; admin notification was not created: {}", title);
            return;
        }
        for (Employee admin : admins) {
            if (admin.isActive()) create(admin, title, message, type, false);
        }
        log.info("Created admin notification '{}' for {} admin(s)", title, admins.stream().filter(Employee::isActive).count());
    }

    @Transactional
    public Notification create(Employee employee, String title, String message, String type, boolean sendEmail) {
        Notification notification = new Notification();
        notification.setEmployee(employee);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setReadStatus(false);

        Notification saved = repository.save(notification);

        if (sendEmail) {
            try {
                emailService.send(employee, title, message);
            } catch (Exception ex) {
                // A Brevo/network failure must not undo a successful leave/damage update
                // or prevent the in-app notification from being stored.
                log.error("Notification email failed for employee {}: {}",
                        employee.getEmployeeId(), ex.getMessage(), ex);
            }
        }

        return saved;
    }
}
