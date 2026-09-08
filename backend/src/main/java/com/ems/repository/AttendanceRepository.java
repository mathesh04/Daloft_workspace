package com.ems.repository;

import com.ems.model.Attendance;
import com.ems.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByEmployeeAndWorkDate(Employee employee, LocalDate workDate);
    List<Attendance> findByEmployeeOrderByWorkDateDesc(Employee employee);
    List<Attendance> findAllByOrderByWorkDateDescCheckInTimeDesc();
    List<Attendance> findByWorkDateOrderByCheckInTimeDesc(LocalDate workDate);
}
