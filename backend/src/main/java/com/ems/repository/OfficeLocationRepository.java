package com.ems.repository;

import com.ems.model.OfficeLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OfficeLocationRepository extends JpaRepository<OfficeLocation, Long> {
    List<OfficeLocation> findByActiveTrue();
}
