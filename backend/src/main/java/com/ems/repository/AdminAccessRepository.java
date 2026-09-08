package com.ems.repository;

import com.ems.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface AdminAccessRepository extends JpaRepository<AdminAccess,Long> {
    List<AdminAccess> findByEmployeeOrderByPermissionAsc(Employee e);

    @Modifying
    @Query("delete from AdminAccess a where a.employee.id = :employeeId")
    int deleteByEmployeeId(@Param("employeeId") Long employeeId);

    boolean existsByEmployeeAndPermissionAndActiveTrue(Employee e,String permission);
}
