package com.ems.controller;

import com.ems.dto.LeaveRequestResponse;
import com.ems.model.LeaveRequest;
import com.ems.model.LeaveStatus;
import com.ems.model.OrganizationHoliday;
import com.ems.repository.LeaveRequestRepository;
import com.ems.service.HolidayService;
import com.ems.service.SystemSettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

@RestController
@RequestMapping("/api/admin/office-calendar")
public class OfficeCalendarController {

    private final HolidayService holidayService;
    private final LeaveRequestRepository leaveRequestRepository;
    private final SystemSettingsService settings;

    public OfficeCalendarController(HolidayService holidayService,
                                    LeaveRequestRepository leaveRequestRepository,
                                    SystemSettingsService settings) {
        this.holidayService = holidayService;
        this.leaveRequestRepository = leaveRequestRepository;
        this.settings = settings;
    }

    @GetMapping
    public Map<String, Object> getOfficeCalendar(@RequestParam(required = false) Integer year,
                                                 @RequestParam(required = false) Integer month) {
        LocalDate today = settings.today();
        int reqYear = (year == null || year < 2000 || year > 2100) ? today.getYear() : year;
        int reqMonth = (month == null || month < 1 || month > 12) ? today.getMonthValue() : month;

        YearMonth ym = YearMonth.of(reqYear, reqMonth);
        LocalDate startOfMonth = ym.atDay(1);
        LocalDate endOfMonth = ym.atEndOfMonth();
        String workingDaysRaw = settings.getString("WORKING_DAYS", "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY");
        List<String> workingDays = Arrays.stream(workingDaysRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(s -> s.toUpperCase(Locale.ROOT))
                .toList();

        List<OrganizationHoliday> yearHolidays = holidayService.byYear(reqYear, true);

        List<LeaveRequest> approvedLeaves = leaveRequestRepository
                .findByStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        LeaveStatus.APPROVED, endOfMonth, startOfMonth
                );

        List<LeaveRequestResponse> leaveResponses = approvedLeaves.stream()
                .sorted(Comparator.comparing(LeaveRequest::getStartDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(LeaveRequestResponse::new)
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("year", reqYear);
        response.put("month", reqMonth);
        response.put("workingDays", workingDays);
        response.put("holidays", yearHolidays);
        response.put("leaves", leaveResponses);

        return response;
    }
}
