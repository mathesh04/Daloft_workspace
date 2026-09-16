package com.ems.repository;
import java.util.List;
 import java.util.Optional;

 import org.springframework.data.jpa.repository.EntityGraph;
 import org.springframework.data.jpa.repository.JpaRepository;
 import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ems.model.InventoryRequest;

import jakarta.persistence.LockModeType;
public interface InventoryRequestRepository extends JpaRepository<InventoryRequest,Long>{
 @EntityGraph(attributePaths = {"employee","component"}) List<InventoryRequest> findAllByOrderByRequestedAtDesc();
 @EntityGraph(attributePaths = {"employee","component"}) List<InventoryRequest> findByEmployeeEmployeeIdOrderByRequestedAtDesc(String employeeId);
 @EntityGraph(attributePaths = {"employee","component"}) @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select r from InventoryRequest r where r.id=:id") Optional<InventoryRequest> findByIdForUpdate(@Param("id") Long id);
}