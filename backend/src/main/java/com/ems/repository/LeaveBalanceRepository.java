package com.ems.repository;

import com.ems.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalance,Long>{
    Optional<LeaveBalance> findByEmployeeIdAndYearAndLeaveType(Long employeeId,int year,String leaveType);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from LeaveBalance b where b.employee.id=:employeeId and b.year=:year and b.leaveType=:leaveType")
    Optional<LeaveBalance> findForUpdate(@Param("employeeId") Long employeeId,@Param("year") int year,@Param("leaveType") String leaveType);
    List<LeaveBalance> findByEmployeeIdAndYearOrderByLeaveTypeAsc(Long employeeId,int year);
}
