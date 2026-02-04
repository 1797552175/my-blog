package com.example.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Email @Size(max = 128) String email,
        String personaPrompt,
        Boolean personaEnabled
) {
}
