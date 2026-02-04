package com.example.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "currentPassword required") String currentPassword,
        @NotBlank @Size(min = 6, max = 72) String newPassword
) {
}
