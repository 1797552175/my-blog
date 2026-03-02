package com.example.api.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record BindPhoneRequest(
        @NotBlank String phone,
        @NotBlank String code
) {
}
