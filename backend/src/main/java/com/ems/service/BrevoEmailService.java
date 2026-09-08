package com.ems.service;

import com.ems.model.Employee;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@Service
public class BrevoEmailService {
    private static final Logger log = LoggerFactory.getLogger(BrevoEmailService.class);
    private final String apiKey, senderEmail, senderName;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public BrevoEmailService(@Value("${brevo.api.key:}") String apiKey,
                             @Value("${brevo.sender.email:}") String senderEmail,
                             @Value("${brevo.sender.name:EMS Management}") String senderName,
                             ObjectMapper mapper) {
        this.apiKey = apiKey; this.senderEmail = senderEmail; this.senderName = senderName; this.mapper = mapper;
    }

    public boolean configured() { return StringUtils.hasText(apiKey) && StringUtils.hasText(senderEmail); }

    public void send(Employee employee, String subject, String message) {
        if (employee == null || !StringUtils.hasText(employee.getEmail())) {
            log.warn("Email not sent: employee/email is missing");
            return;
        }
        if (!configured()) {
            log.warn("Brevo is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL. Email to {} was skipped.", employee.getEmail());
            return;
        }
        try {
            Map<String,Object> payload = new LinkedHashMap<>();
            payload.put("sender", Map.of("email", senderEmail, "name", senderName));
            payload.put("to", List.of(Map.of("email", employee.getEmail(), "name", employee.getName())));
            payload.put("subject", subject);
            payload.put("textContent", message);
            String json = mapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .timeout(Duration.ofSeconds(20)).header("api-key", apiKey)
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json)).build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300)
                throw new IllegalStateException("Brevo rejected email: HTTP " + response.statusCode() + " - " + response.body());
            log.info("Brevo email accepted for delivery to {} (HTTP {})", employee.getEmail(), response.statusCode());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Email sending interrupted", ex);
        } catch (Exception ex) {
            throw new IllegalStateException("Email notification could not be sent", ex);
        }
    }
    public void sendPasswordReset(Employee employee, String resetUrl) {
        String body = "Hello " + employee.getName() + ",\n\nWe received a password reset request for your EMS account.\n\nReset your password: " + resetUrl + "\n\nThis link expires in 15 minutes and can only be used once. If you did not request this, you can ignore this email.\n\nEMS Management";
        send(employee, "Reset your EMS password", body);
    }
}
