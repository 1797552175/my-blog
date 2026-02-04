package com.example.api.auth.dto;

public record UserMeResponse(
        Long id,
        String username,
        String email,
        String personaPrompt,
        boolean personaEnabled
) {
}
