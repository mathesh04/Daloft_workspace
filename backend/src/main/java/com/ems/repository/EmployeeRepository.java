package com.ems.repository;
import com.ems.model.*; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.data.jpa.repository.Lock; import org.springframework.data.jpa.repository.Query; import org.springframework.data.repository.query.Param; import jakarta.persistence.LockModeType; import java.util.*;
public interface EmployeeRepository extends JpaRepository<Employee,Long>{ Optional<Employee> findByEmployeeId(String employeeId); boolean existsByEmployeeId(String employeeId); List<Employee> findByRole(Role role); List<Employee> findByRoleIn(Collection<Role> roles); List<Employee> findByDepartmentIgnoreCaseAndActiveTrue(String department); List<Employee> findByReportingManager(Employee manager); 
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Employee e where e.id = :id")
    Optional<Employee> findByIdForUpdate(@Param("id") Long id);
}
