package com.example.api.auth.dto;

import com.example.api.auth.validator.PasswordComplexity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "currentPassword required") String currentPassword,
        @NotBlank @Size(min = 8, max = 72) @PasswordComplexity String newPassword
) {
}
