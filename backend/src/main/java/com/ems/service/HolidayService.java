package com.ems.service;

import com.ems.model.OrganizationHoliday;
import com.ems.repository.OrganizationHolidayRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

@Service
public class HolidayService {
    private final OrganizationHolidayRepository repository;
    private final SystemSettingsService settings;
    private final AuditService audit;

    public HolidayService(OrganizationHolidayRepository repository, SystemSettingsService settings, AuditService audit) {
        this.repository = repository; this.settings = settings; this.audit = audit;
    }

    public List<OrganizationHoliday> byYear(int year, boolean activeOnly) {
        LocalDate from = LocalDate.of(year,1,1), to = LocalDate.of(year,12,31);
        List<OrganizationHoliday> base = activeOnly
                ? repository.findByHolidayDateBetweenAndActiveTrueOrderByHolidayDateAsc(from,to)
                : repository.findByHolidayDateBetweenOrderByHolidayDateAsc(from,to);
        List<OrganizationHoliday> recurring = repository.findByActiveTrue().stream()
                .filter(OrganizationHoliday::isRecurring)
                .filter(h -> h.getHolidayDate()!=null && h.getHolidayDate().getYear()!=year)
                .map(h -> copyForYear(h, year))
                .filter(h -> !activeOnly || h.isActive())
                .toList();
        List<OrganizationHoliday> out = new ArrayList<>(base);
        out.addAll(recurring.stream().filter(x -> out.stream().noneMatch(y -> y.getHolidayDate().equals(x.getHolidayDate()))).toList());
        out.sort(Comparator.comparing(OrganizationHoliday::getHolidayDate));
        return out;
    }

    public boolean isHoliday(LocalDate date) {
        if (date == null) return false;
        Optional<OrganizationHoliday> exact = repository.findByHolidayDate(date);
        if (exact.isPresent()) return exact.get().isActive();
        return repository.findByActiveTrue().stream().anyMatch(h -> h.isRecurring()
                && h.getHolidayDate()!=null
                && h.getHolidayDate().getMonthValue()==date.getMonthValue()
                && h.getHolidayDate().getDayOfMonth()==date.getDayOfMonth());
    }

    private OrganizationHoliday copyForYear(OrganizationHoliday source, int year) {
        OrganizationHoliday h = new OrganizationHoliday();
        h.setName(source.getName());
        try { h.setHolidayDate(source.getHolidayDate().withYear(year)); }
        catch (java.time.DateTimeException ex) { h.setHolidayDate(LocalDate.of(year,2,28)); }
        h.setDescription(source.getDescription());
        h.setType(source.getType());
        h.setRecurring(true);
        h.setActive(source.isActive());
        h.setCreatedBy(source.getCreatedBy());
        h.setUpdatedBy(source.getUpdatedBy());
        return h;
    }

    public boolean isWorkingDay(LocalDate date) {
        if (date == null) return false;
        Set<String> workingDays = Arrays.stream(settings.getString("WORKING_DAYS", "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY").split(","))
                .map(String::trim).filter(s -> !s.isBlank()).map(String::toUpperCase).collect(java.util.stream.Collectors.toSet());
        return workingDays.contains(date.getDayOfWeek().name()) && !isHoliday(date);
    }

    public long countWorkingDays(LocalDate start, LocalDate end) {
        if (start == null || end == null || end.isBefore(start)) return 0;
        long count = 0;
        for (LocalDate d=start; !d.isAfter(end); d=d.plusDays(1)) if (isWorkingDay(d)) count++;
        return count;
    }

    @Transactional
    public OrganizationHoliday create(OrganizationHoliday h, Authentication auth) {
        validate(h, null);
        h.setType(normalizeType(h.getType())); h.setName(clean(h.getName()));
        h.setCreatedBy(actor(auth)); h.setUpdatedBy(actor(auth));
        OrganizationHoliday saved=repository.save(h);
        audit.log(auth,"HOLIDAY_CREATED","Created holiday " + saved.getName(),"HOLIDAY",saved.getId(),"SUCCESS",null);
        return saved;
    }

    @Transactional
    public OrganizationHoliday update(Long id, OrganizationHoliday input, Authentication auth) {
        OrganizationHoliday h=repository.findById(id).orElseThrow(()->new IllegalArgumentException("Holiday not found"));
        validate(input, id);
        h.setName(clean(input.getName())); h.setHolidayDate(input.getHolidayDate()); h.setDescription(input.getDescription());
        h.setType(normalizeType(input.getType())); h.setRecurring(input.isRecurring()); h.setActive(input.isActive()); h.setUpdatedBy(actor(auth));
        OrganizationHoliday saved=repository.save(h);
        audit.log(auth,"HOLIDAY_UPDATED","Updated holiday " + saved.getName(),"HOLIDAY",saved.getId(),"SUCCESS",null);
        return saved;
    }

    @Transactional
    public OrganizationHoliday setActive(Long id, boolean active, Authentication auth) {
        OrganizationHoliday h=repository.findById(id).orElseThrow(()->new IllegalArgumentException("Holiday not found"));
        h.setActive(active); h.setUpdatedBy(actor(auth)); OrganizationHoliday saved=repository.save(h);
        audit.log(auth,"HOLIDAY_STATUS_CHANGED","Set holiday " + saved.getName() + " to " + (active?"ACTIVE":"INACTIVE"),"HOLIDAY",id,"SUCCESS",null);
        return saved;
    }

    @Transactional
    public void delete(Long id, Authentication auth) {
        OrganizationHoliday h=repository.findById(id).orElseThrow(()->new IllegalArgumentException("Holiday not found"));
        repository.delete(h);
        audit.log(auth,"HOLIDAY_DELETED","Deleted holiday " + h.getName(),"HOLIDAY",id,"SUCCESS",null);
    }

    private void validate(OrganizationHoliday h, Long currentId) {
        if (h == null) throw new IllegalArgumentException("Holiday data is required");
        if (h.getName()==null || h.getName().isBlank()) throw new IllegalArgumentException("Holiday name is required");
        if (h.getHolidayDate()==null) throw new IllegalArgumentException("Holiday date is required");
        repository.findByHolidayDate(h.getHolidayDate()).ifPresent(existing -> {
            if (currentId == null || !Objects.equals(existing.getId(), currentId)) throw new IllegalArgumentException("A holiday already exists for this date");
        });
        if (h.getName().trim().length() > 160) throw new IllegalArgumentException("Holiday name is too long");
    }

    private String normalizeType(String t) { String s=(t==null?"PUBLIC":t).trim().toUpperCase(Locale.ROOT); return s.isBlank()?"PUBLIC":s; }
    private String clean(String s) { return s.trim().replaceAll("\\s+"," "); }
    private String actor(Authentication a) { return a==null?"SYSTEM":a.getName(); }
}
