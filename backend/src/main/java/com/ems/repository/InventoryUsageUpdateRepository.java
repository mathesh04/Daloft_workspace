package com.ems.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ems.model.InventoryUsageUpdate;
import com.ems.model.UsageStatus;

import jakarta.persistence.LockModeType;

public interface InventoryUsageUpdateRepository extends JpaRepository<InventoryUsageUpdate, Long> {
    @EntityGraph(attributePaths = {"employee","component","request","request.employee","request.component"})
    List<InventoryUsageUpdate> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"employee","component","request","request.employee","request.component"})
    List<InventoryUsageUpdate> findByEmployeeEmployeeIdOrderByCreatedAtDesc(String employeeId);

    boolean existsByRequestIdAndUsageStatus(Long requestId, UsageStatus status);

    @EntityGraph(attributePaths = {"employee","component","request","request.employee","request.component"})
    List<InventoryUsageUpdate> findByRequestId(Long requestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from InventoryUsageUpdate u where u.id = :id")
    Optional<InventoryUsageUpdate> findByIdForUpdate(@Param("id") Long id);
}
