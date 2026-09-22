package com.ems.repository;

import com.ems.model.Employee;
import com.ems.model.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    @EntityGraph(attributePaths = {"reportingManager"})
    List<Employee> findAll();

    @EntityGraph(attributePaths = {"reportingManager"})
    Optional<Employee> findByEmployeeId(String employeeId);

    boolean existsByEmployeeId(String employeeId);

    @EntityGraph(attributePaths = {"reportingManager"})
    List<Employee> findByRole(Role role);

    @EntityGraph(attributePaths = {"reportingManager"})
    List<Employee> findByRoleIn(Collection<Role> roles);

    List<Employee> findByDepartmentIgnoreCaseAndActiveTrue(String department);

    List<Employee> findByReportingManager(Employee manager);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Employee e where e.id = :id")
    Optional<Employee> findByIdForUpdate(@Param("id") Long id);
}
