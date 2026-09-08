package com.ems.config;

import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Prevents accidental lazy-loading of entire JPA graphs during JSON serialization.
 * REST controllers should expose DTOs or deliberately fetched associations. */
@Configuration
public class JacksonConfig {
    @Bean
    public Hibernate6Module hibernate6Module() {
        return new Hibernate6Module();
    }
}
