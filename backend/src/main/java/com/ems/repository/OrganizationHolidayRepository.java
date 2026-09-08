package com.ems.repository;

import com.ems.model.OrganizationHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface OrganizationHolidayRepository extends JpaRepository<OrganizationHoliday, Long> {
    List<OrganizationHoliday> findByHolidayDateBetweenAndActiveTrueOrderByHolidayDateAsc(LocalDate from, LocalDate to);
    List<OrganizationHoliday> findByHolidayDateBetweenOrderByHolidayDateAsc(LocalDate from, LocalDate to);
    boolean existsByHolidayDate(LocalDate date);
    Optional<OrganizationHoliday> findByHolidayDate(LocalDate date);
    List<OrganizationHoliday> findByActiveTrue();
}
