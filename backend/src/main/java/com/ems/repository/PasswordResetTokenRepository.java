package com.ems.repository; 
import com.ems.model.PasswordResetToken; 
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository; 
import java.util.*;
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken,Long>{ 
    @EntityGraph(attributePaths = {"employee"})
    Optional<PasswordResetToken> findFirstByTokenHashAndUsedFalse(String tokenHash); 
    List<PasswordResetToken> findByEmployeeIdAndUsedFalse(Long employeeId); 
}