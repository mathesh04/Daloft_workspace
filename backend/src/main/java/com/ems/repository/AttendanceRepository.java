package com.ems.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ems.model.Attendance;
import com.ems.model.Employee;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByEmployeeAndWorkDate(Employee employee, LocalDate workDate);
    List<Attendance> findByEmployeeOrderByWorkDateDesc(Employee employee);
    @Query("SELECT a FROM Attendance a JOIN FETCH a.employee ORDER BY a.workDate DESC, a.checkInTime DESC")
    List<Attendance> findAllByOrderByWorkDateDescCheckInTimeDesc();

    @Query("SELECT a FROM Attendance a JOIN FETCH a.employee WHERE a.workDate = :workDate ORDER BY a.checkInTime DESC")
    List<Attendance> findByWorkDateOrderByCheckInTimeDesc(@Param("workDate") LocalDate workDate);
}
