package com.ems.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

public final class TimeUtil {

    public static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");

    private TimeUtil() {
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(INDIA);
    }

    public static LocalDate today() {
        return LocalDate.now(INDIA);
    }
}