package com.ems.service;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.model.Employee;
import com.ems.model.Notification;
import com.ems.model.Role;
import com.ems.repository.EmployeeRepository;
import com.ems.repository.NotificationRepository;

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
    public void notifyAdmins(String title, String message) {
        notifyAdmins(title, message, "INFO");
    }

    @Transactional
    public void notifyAdmins(String title, String message, String type) {
        List<Employee> admins = new java.util.ArrayList<>();
        admins.addAll(employeeRepository.findByRoleIn(List.of(Role.ADMIN, Role.HR_ADMIN)));
        admins.addAll(employeeRepository.findByRole(Role.SYSTEM_ADMIN));
        if (admins.isEmpty()) {
            log.warn("No ADMIN employee found; admin notification was not created: {}", title);
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
                log.error("Notification email failed for employee {}: {}",
                        employee.getEmployeeId(), ex.getMessage(), ex);
            }
        }

        return saved;
    }
}
