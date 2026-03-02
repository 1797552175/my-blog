package com.example.api.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record ResetPasswordSendRequest(
        @NotBlank String phone
) {
}
