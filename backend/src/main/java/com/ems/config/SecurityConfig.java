package com.ems.config;

import com.ems.security.JwtAuthFilter;
import com.ems.filter.AdminAccessFilter;
import com.ems.filter.AuditRequestFilter;
import com.ems.filter.MaintenanceModeFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${cors.allowed-origin-patterns:*}")
    private String allowedOriginPatterns;

    private final JwtAuthFilter jwtAuthFilter;
    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public AdminAccessFilter adminAccessFilter(com.ems.service.AdminAccessService s){ return new AdminAccessFilter(s); }

    @Bean
    public MaintenanceModeFilter maintenanceModeFilter(com.ems.service.SystemSettingsService s){ return new MaintenanceModeFilter(s); }

    @Bean
    public AuditRequestFilter auditRequestFilter(com.ems.repository.AuditLogRepository r){ return new AuditRequestFilter(r); }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, AdminAccessFilter adminAccessFilter, AuditRequestFilter auditRequestFilter, MaintenanceModeFilter maintenanceModeFilter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/system-admin/**").hasRole("SYSTEM_ADMIN")
                .requestMatchers("/api/manager/**").hasRole("MANAGER")
                .requestMatchers("/api/hr/**", "/api/admin/**").hasAnyRole("ADMIN", "HR_ADMIN", "SYSTEM_ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(maintenanceModeFilter, JwtAuthFilter.class)
            .addFilterAfter(auditRequestFilter, MaintenanceModeFilter.class)
            .addFilterAfter(adminAccessFilter, AuditRequestFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        List<String> patterns = (allowedOriginPatterns == null || allowedOriginPatterns.isBlank() || allowedOriginPatterns.equals("*"))
                ? List.of("*")
                : java.util.Arrays.stream(allowedOriginPatterns.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .toList();

        config.setAllowedOriginPatterns(patterns.isEmpty() ? List.of("*") : patterns);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("*", "Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
