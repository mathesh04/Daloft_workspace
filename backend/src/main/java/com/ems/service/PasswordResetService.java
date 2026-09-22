package com.ems.service;
import com.ems.model.*; 
import com.ems.repository.*; 
import org.springframework.beans.factory.annotation.Value; 
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; 
import java.nio.charset.StandardCharsets; import java.security.*; 
import java.time.*; 
import java.util.*;
@Service 
public class PasswordResetService {
    private final EmployeeRepository employees; 
    private final PasswordResetTokenRepository tokens; 
    private final PasswordEncoder encoder; 
    private final BrevoEmailService email; 
    private final SystemSettingsService settings;
 @Value("${app.frontend.reset-password-url:https://daloft-workspace.vercel.app/reset-password}") 
    private String resetBaseUrl;
    public PasswordResetService(EmployeeRepository e,PasswordResetTokenRepository t,PasswordEncoder p,BrevoEmailService b,SystemSettingsService s){employees=e;tokens=t;encoder=p;email=b;settings=s;}
 @Transactional
 public void request(String identity){
    if(identity==null||identity.isBlank())return; 
    Employee e=employees.findAll().stream().filter(x->x.getEmployeeId().equalsIgnoreCase(identity)||(x.getEmail()!=null&&x.getEmail().equalsIgnoreCase(identity))).findFirst().orElse(null); 
    if(e==null||!e.isActive()||e.getEmail()==null||e.getEmail().isBlank())return; 
    var old=tokens.findByEmployeeIdAndUsedFalse(e.getId()); 
    old.forEach(x->x.setUsed(true)); 
    tokens.saveAll(old); 
    String raw=random();PasswordResetToken t=new PasswordResetToken();
    t.setEmployee(e);
    t.setTokenHash(hash(raw));
    t.setExpiryTime(settings.now().plusMinutes(15));tokens.save(t); 
    email.sendPasswordReset(e,resetBaseUrl+"?token="+raw);}
  @Transactional
  public Employee reset(String raw,String newPassword){
     if(raw==null||raw.isBlank())throw new IllegalArgumentException("Reset token is required"); 
     if(newPassword==null||newPassword.length()<8)throw new IllegalArgumentException("Password must be at least 8 characters");
     PasswordResetToken t=tokens.findFirstByTokenHashAndUsedFalse(hash(raw)).orElseThrow(()->new IllegalArgumentException("Invalid or expired reset link"));
     if(t.getExpiryTime().isBefore(settings.now()))throw new IllegalArgumentException("Reset link has expired");
     Employee e=t.getEmployee();
     e.setPassword(encoder.encode(newPassword));
     e.setLoginFailedAttempts(0);
     e.setLockedUntil(null);
     e=employees.save(e);
     t.setUsed(true);
     tokens.save(t);
     return e;
  }
 private String random(){
    byte[] b=new byte[32];
    new SecureRandom().nextBytes(b);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
} 
private String hash(String s){
    try{byte[] d=MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
    StringBuilder x=new StringBuilder();
    for(byte v:d)x.append(String.format("%02x",v));
    return x.toString();
}catch(Exception e){
    throw new IllegalStateException(e);
        }
    }
}