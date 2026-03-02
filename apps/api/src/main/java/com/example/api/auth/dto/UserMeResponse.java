package com.example.api.auth.dto;

public record UserMeResponse(
        Long id,
        String username,
        String email,
        String phone,
        String personaPrompt,
        boolean personaEnabled,
        String defaultAiModel,
        boolean admin
) {
}
