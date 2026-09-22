package com.ems.repository;

import com.ems.model.Department;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    @EntityGraph(attributePaths = {"manager"})
    List<Department> findAll(Sort sort);

    @EntityGraph(attributePaths = {"manager"})
    List<Department> findAll();

    @EntityGraph(attributePaths = {"manager"})
    Optional<Department> findById(Long id);

    @EntityGraph(attributePaths = {"manager"})
    Optional<Department> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);
    boolean existsByCodeIgnoreCase(String code);

    @EntityGraph(attributePaths = {"manager"})
    List<Department> findByActiveTrueOrderByNameAsc();

    @EntityGraph(attributePaths = {"manager"})
    List<Department> findByManagerId(Long managerId);
}
