package com.ems.repository;
import com.ems.model.Component;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface ComponentRepository extends JpaRepository<Component,Long>{
    boolean existsByComponentCode(String componentCode);
    boolean existsByComponentCodeAndIdNot(String componentCode, Long id);
    List<Component> findAllByOrderByNameAsc();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<Component> findWithLockById(Long id);
}
