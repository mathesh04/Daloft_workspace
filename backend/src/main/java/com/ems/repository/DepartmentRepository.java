package com.ems.repository;
import com.ems.model.Department; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface DepartmentRepository extends JpaRepository<Department,Long>{ Optional<Department> findByNameIgnoreCase(String name); boolean existsByNameIgnoreCase(String name); boolean existsByCodeIgnoreCase(String code); List<Department> findByActiveTrueOrderByNameAsc(); List<Department> findByManagerId(Long managerId); }
