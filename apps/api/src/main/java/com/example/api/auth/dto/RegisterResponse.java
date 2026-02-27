package com.example.api.auth.dto;

public record RegisterResponse(
        Long id,
        String username,
        String email
) {
}
