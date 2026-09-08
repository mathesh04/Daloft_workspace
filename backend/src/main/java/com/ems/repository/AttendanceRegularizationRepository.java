package com.ems.repository;
import com.ems.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AttendanceRegularizationRepository extends JpaRepository<AttendanceRegularizationRequest,Long>{
    List<AttendanceRegularizationRequest> findByEmployeeEmployeeIdOrderByCreatedAtDesc(String employeeId);
    List<AttendanceRegularizationRequest> findByStatusOrderByCreatedAtAsc(AttendanceRegularizationRequest.RegularizationStatus status);
}
