package com.example.api.auth.dto;

import com.example.api.auth.validator.PasswordComplexity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 32) String username,
        @NotBlank @Size(min = 8, max = 72) @PasswordComplexity String password,
        @NotBlank String phone,
        @NotBlank String smsCode
) {
}
