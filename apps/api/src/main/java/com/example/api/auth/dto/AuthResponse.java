package com.example.api.auth.dto;

public record AuthResponse(
        String token,
        String username
) {
}
