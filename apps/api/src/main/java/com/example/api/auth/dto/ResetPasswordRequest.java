package com.example.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank String phone,
        @NotBlank String code,
        @NotBlank @Size(min = 8, max = 72) String newPassword
) {
}
