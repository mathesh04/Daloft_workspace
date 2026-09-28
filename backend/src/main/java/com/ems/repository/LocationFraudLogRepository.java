package com.ems.repository;

import com.ems.model.LocationFraudLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LocationFraudLogRepository extends JpaRepository<LocationFraudLog, Long> {
    List<LocationFraudLog> findAllByOrderByCreatedAtDesc();
    List<LocationFraudLog> findByReviewedFalseOrderByCreatedAtDesc();
    List<LocationFraudLog> findByEmployeeEmployeeIdOrderByCreatedAtDesc(String employeeId);
    long countByReviewedFalse();
}
