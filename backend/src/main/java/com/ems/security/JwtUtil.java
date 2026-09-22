package com.ems.security;
import com.ems.service.SystemSettingsService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {
    @Value("${jwt.secret}") private String secret;
    @Value("${jwt.expiration-ms}") private long defaultExpirationMs;
    private final SystemSettingsService settings;
    public JwtUtil(SystemSettingsService settings){this.settings=settings;}
    private SecretKey key(){return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));}
    public String generateToken(String employeeId,String role){
        Date now=new Date(); long minutes=settings.getLong("SESSION_TIMEOUT_MINUTES", defaultExpirationMs/60000L); Date expiry=new Date(now.getTime()+Math.max(5,minutes)*60_000L);
        return Jwts.builder().subject(employeeId).claim("role",role).issuedAt(now).expiration(expiry).signWith(key()).compact();
    }
    public String extractEmployeeId(String token){return extractClaim(token,Claims::getSubject);}
    public String extractRole(String token){return extractClaim(token,claims->claims.get("role",String.class));}
    public boolean isTokenValid(String token){try{return !extractClaim(token,Claims::getExpiration).before(new Date());}catch(Exception e){return false;}}
    private <T>T extractClaim(String token,Function<Claims,T> resolver){return resolver.apply(Jwts.parser().verifyWith(key()).build().parseSignedClaims(token).getPayload());}
}
