package com.ems.service;

import java.time.DateTimeException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ems.model.SystemSetting;
import com.ems.repository.SystemSettingRepository;

@Service
public class SystemSettingsService {
    private static final Set<String> BOOLEAN_KEYS = Set.of(
            "ATTENDANCE_ENABLED", "CHECK_IN_ENABLED", "CHECK_OUT_ENABLED", "GEOFENCE_ENABLED",
            "MAINTENANCE_MODE", "EMPLOYEE_LOGIN_ENABLED", "MANAGER_LOGIN_ENABLED", "HR_ADMIN_LOGIN_ENABLED"
    );
    private static final Set<String> INTEGER_KEYS = Set.of(
            "GEOFENCE_RADIUS", "LATE_GRACE_MINUTES", "MIN_WORK_MINUTES", "MAX_GPS_ACCURACY",
            "MAX_LOGIN_ATTEMPTS", "ACCOUNT_LOCK_MINUTES", "SESSION_TIMEOUT_MINUTES", "LEAVE_CASUAL_DAYS", "LEAVE_SICK_DAYS", "LEAVE_EARNED_DAYS"
    );
    private static final Map<String, String> DEFAULTS = Map.ofEntries(
            Map.entry("ATTENDANCE_ENABLED", "true"),
            Map.entry("CHECK_IN_ENABLED", "true"),
            Map.entry("CHECK_OUT_ENABLED", "true"),
            Map.entry("GEOFENCE_ENABLED", "false"),
            Map.entry("GEOFENCE_RADIUS", "100"),
            Map.entry("LATE_GRACE_MINUTES", "10"),
            Map.entry("MIN_WORK_MINUTES", "480"),
            Map.entry("MAX_GPS_ACCURACY", "100"),
            Map.entry("MAX_LOGIN_ATTEMPTS", "5"),
            Map.entry("ACCOUNT_LOCK_MINUTES", "15"),
            Map.entry("SESSION_TIMEOUT_MINUTES", "30"),
            Map.entry("MAINTENANCE_MODE", "false"),
            Map.entry("EMPLOYEE_LOGIN_ENABLED", "true"),
            Map.entry("MANAGER_LOGIN_ENABLED", "true"),
            Map.entry("HR_ADMIN_LOGIN_ENABLED", "true"),
            Map.entry("TIMEZONE", "Asia/Kolkata"),
            Map.entry("WORKING_DAYS", "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY"),
            Map.entry("WORK_START_TIME", "09:00"),
            Map.entry("WORK_END_TIME", "18:00"),
            Map.entry("LEAVE_CASUAL_DAYS", "12"), Map.entry("LEAVE_SICK_DAYS", "12"), Map.entry("LEAVE_EARNED_DAYS", "15")
    );

    private final SystemSettingRepository repository;

    public SystemSettingsService(SystemSettingRepository repository) { this.repository = repository; }

    public boolean getBoolean(String key, boolean fallback) {
        String v = value(key);
        return v == null ? fallback : Boolean.parseBoolean(v);
    }

    public int getInt(String key, int fallback) {
        String v = value(key);
        if (v == null) return fallback;
        try { return Integer.parseInt(v); } catch (NumberFormatException ex) { return fallback; }
    }

    public long getLong(String key, long fallback) {
        String v = value(key);
        if (v == null) return fallback;
        try { return Long.parseLong(v); } catch (NumberFormatException ex) { return fallback; }
    }

    public String getString(String key, String fallback) {
        String v = value(key);
        return v == null || v.isBlank() ? fallback : v;
    }

    public String value(String key) {
        String k = key == null ? "" : key.trim().toUpperCase(Locale.ROOT);
        return repository.findById(k).map(SystemSetting::getValue).orElse(DEFAULTS.get(k));
    }

    public Map<String, Object> allTyped() {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : DEFAULTS.entrySet()) {
            String key = entry.getKey();
            if (BOOLEAN_KEYS.contains(key)) out.put(key, getBoolean(key, Boolean.parseBoolean(entry.getValue())));
            else if (INTEGER_KEYS.contains(key)) out.put(key, getInt(key, Integer.parseInt(entry.getValue())));
            else out.put(key, getString(key, entry.getValue()));
        }
        repository.findAll().forEach(s -> {
            String key = s.getKey();
            if (key == null) return;
            if (BOOLEAN_KEYS.contains(key)) out.put(key, getBoolean(key, false));
            else if (INTEGER_KEYS.contains(key)) out.put(key, getInt(key, 0));
            else out.put(key, s.getValue());
        });
        return out;
    }

    public ZoneId zoneId() {
        try { return ZoneId.of(getString("TIMEZONE", "Asia/Kolkata")); }
        catch (Exception ex) { return ZoneId.of("Asia/Kolkata"); }
    }

    public LocalDate today() {
        return LocalDate.now(zoneId());
    }

    public LocalDateTime now() {
        return LocalDateTime.now(zoneId());
    }

    public boolean isKnown(String key) {
        return DEFAULTS.containsKey(key) || BOOLEAN_KEYS.contains(key) || INTEGER_KEYS.contains(key);
    }

    @Transactional
    public Map<String, Object> update(Map<String, ?> body) {
        if (body == null) return allTyped();
        for (Map.Entry<String, ?> e : body.entrySet()) {
            String key = e.getKey() == null ? "" : e.getKey().trim().toUpperCase(Locale.ROOT);
            if (!isKnown(key)) continue;
            String value = normalize(key, e.getValue());
            SystemSetting setting = repository.findById(key).orElseGet(SystemSetting::new);
            setting.setKey(key);
            setting.setValue(value);
            repository.save(setting);
        }
        String start = value("WORK_START_TIME");
        String end = value("WORK_END_TIME");
        if (start != null && end != null) {
            try {
                if (!java.time.LocalTime.parse(end).isAfter(java.time.LocalTime.parse(start)))
                    throw new IllegalArgumentException("Office closing time must be later than opening time");
            } catch (DateTimeException ex) {
                throw new IllegalArgumentException("Office timing must use valid HH:mm values");
            }
        }
        return allTyped();
    }

    private String normalize(String key, Object raw) {
        if (BOOLEAN_KEYS.contains(key)) {
            if (raw instanceof Boolean b) return String.valueOf(b);
            String s = String.valueOf(raw).trim().toLowerCase(Locale.ROOT);
            if ("true".equals(s) || "false".equals(s)) return s;
            throw new IllegalArgumentException(key.replace('_', ' ') + " must be true or false");
        }
        if (INTEGER_KEYS.contains(key)) {
            int value;
            try { value = raw instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(raw).trim()); }
            catch (Exception ex) { throw new IllegalArgumentException(key.replace('_', ' ') + " must be a valid number"); }
            if (key.equals("GEOFENCE_RADIUS") && (value < 1 || value > 50000)) throw new IllegalArgumentException("Geofence radius must be between 1 and 50,000 meters");
            if (key.equals("MAX_GPS_ACCURACY") && (value < 1 || value > 5000)) throw new IllegalArgumentException("Maximum GPS accuracy must be between 1 and 5,000 meters");
            if (key.equals("LATE_GRACE_MINUTES") && (value < 0 || value > 1440)) throw new IllegalArgumentException("Late grace period must be between 0 and 1,440 minutes");
            if (key.equals("MIN_WORK_MINUTES") && (value < 0 || value > 1440)) throw new IllegalArgumentException("Minimum work duration must be between 0 and 1,440 minutes");
            if (key.equals("MAX_LOGIN_ATTEMPTS") && (value < 1 || value > 20)) throw new IllegalArgumentException("Maximum login attempts must be between 1 and 20");
            if (key.equals("ACCOUNT_LOCK_MINUTES") && (value < 1 || value > 1440)) throw new IllegalArgumentException("Account lock duration must be between 1 and 1,440 minutes");
            if (key.equals("SESSION_TIMEOUT_MINUTES") && (value < 5 || value > 1440)) throw new IllegalArgumentException("Session timeout must be between 5 and 1,440 minutes");
            if (key.startsWith("LEAVE_") && value < 0) throw new IllegalArgumentException("Leave allocation cannot be negative");
            return String.valueOf(value);
        }
        String text = raw == null ? "" : String.valueOf(raw).trim();
        if ("TIMEZONE".equals(key)) {
            if (text.isBlank()) throw new IllegalArgumentException("Timezone is required");
            try { ZoneId.of(text); } catch (Exception ex) { throw new IllegalArgumentException("Invalid timezone: " + text); }
        }
        if ("WORK_START_TIME".equals(key) || "WORK_END_TIME".equals(key)) {
            if (text.isBlank()) throw new IllegalArgumentException(key.replace("_", " ") + " is required");
            try { java.time.LocalTime.parse(text); } catch (Exception ex) { throw new IllegalArgumentException(key.replace("_", " ") + " must use HH:mm format"); }
            return java.time.LocalTime.parse(text).toString().length() == 5 ? java.time.LocalTime.parse(text).toString() : java.time.LocalTime.parse(text).toString();
        }
        if ("WORKING_DAYS".equals(key)) {
            if (text.isBlank()) throw new IllegalArgumentException("Working days are required");
            for (String d : text.split(",")) {
                try { DayOfWeek.valueOf(d.trim().toUpperCase(Locale.ROOT)); }
                catch (Exception ex) { throw new IllegalArgumentException("Invalid working day: " + d); }
            }
            return java.util.Arrays.stream(text.split(",")).map(String::trim).filter(s->!s.isBlank())
                    .map(s->s.toUpperCase(Locale.ROOT)).distinct().sorted().collect(java.util.stream.Collectors.joining(","));
        }
        return text;
    }
}
