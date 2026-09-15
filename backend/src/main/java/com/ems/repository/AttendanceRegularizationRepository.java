package com.ems.repository;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.ems.model.AttendanceRegularizationRequest;
public interface AttendanceRegularizationRepository extends JpaRepository<AttendanceRegularizationRequest,Long>{
    @Query("SELECT r FROM AttendanceRegularizationRequest r JOIN FETCH r.employee JOIN FETCH r.attendance ORDER BY r.createdAt DESC")
    List<AttendanceRegularizationRequest> findAllWithDetails();
    @Query("SELECT r FROM AttendanceRegularizationRequest r JOIN FETCH r.employee JOIN FETCH r.attendance WHERE r.employee.employeeId = :employeeId ORDER BY r.createdAt DESC")
    List<AttendanceRegularizationRequest> findByEmployeeEmployeeIdOrderByCreatedAtDesc(@org.springframework.data.repository.query.Param("employeeId") String employeeId);
    List<AttendanceRegularizationRequest> findByStatusOrderByCreatedAtAsc(AttendanceRegularizationRequest.RegularizationStatus status);
}
