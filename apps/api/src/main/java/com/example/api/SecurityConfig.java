package com.example.api;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.api.security.JwtAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/health").permitAll()
                        .requestMatchers("/api/health").permitAll()
                        .requestMatchers("/swagger-ui/**").permitAll()
                        .requestMatchers("/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/**").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/posts").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/posts/slug/**").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/posts/search").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/posts/*/comments").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/posts/*/comments").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/tags").permitAll()
                        .requestMatchers("/api/inspirations/**").authenticated()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/ai/persona/chat").permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/ai/persona/chat/stream").permitAll()
                        .requestMatchers("/api/ai/**").authenticated()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

}
