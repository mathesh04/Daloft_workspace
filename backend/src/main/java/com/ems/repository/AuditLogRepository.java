package com.ems.repository;
import com.ems.model.AuditLog;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
public interface AuditLogRepository extends JpaRepository<AuditLog,Long>{
 List<AuditLog> findTop50ByOrderByCreatedAtDesc();
 @Query("select a from AuditLog a where a.action in ('CREATE_CATEGORY','STOCK_IN','STOCK_OUT','REQUEST_ITEM','REJECT_REQUEST','APPROVE_REQUEST','USAGE_UPDATE','APPROVE_RETURN','REJECT_RETURN') order by a.createdAt desc")
 List<AuditLog> findInventoryAuditLogs();
 @Query("select a from AuditLog a where (:actor = '' or lower(a.actor) like lower(concat('%',:actor,'%'))) and (:action = '' or lower(a.action) like lower(concat('%',:action,'%')))") Page<AuditLog> searchWithoutDates(@Param("actor") String actor,@Param("action") String action,Pageable pageable);
 @Query("select a from AuditLog a where (:actor = '' or lower(a.actor) like lower(concat('%',:actor,'%'))) and (:action = '' or lower(a.action) like lower(concat('%',:action,'%'))) and a.createdAt >= :fromDate") Page<AuditLog> searchFromDate(@Param("actor") String actor,@Param("action") String action,@Param("fromDate") LocalDateTime fromDate,Pageable pageable);
 @Query("select a from AuditLog a where (:actor = '' or lower(a.actor) like lower(concat('%',:actor,'%'))) and (:action = '' or lower(a.action) like lower(concat('%',:action,'%'))) and a.createdAt <= :toDate") Page<AuditLog> searchToDate(@Param("actor") String actor,@Param("action") String action,@Param("toDate") LocalDateTime toDate,Pageable pageable);
 @Query("select a from AuditLog a where (:actor = '' or lower(a.actor) like lower(concat('%',:actor,'%'))) and (:action = '' or lower(a.action) like lower(concat('%',:action,'%'))) and a.createdAt >= :fromDate and a.createdAt <= :toDate") Page<AuditLog> searchDateRange(@Param("actor") String actor,@Param("action") String action,@Param("fromDate") LocalDateTime fromDate,@Param("toDate") LocalDateTime toDate,Pageable pageable);
}
