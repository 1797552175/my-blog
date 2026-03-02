package com.example.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.example.api.sms.SmsScene;

public record SendSmsRequest(
        @NotBlank String phone,
        @NotNull SmsScene scene
) {
}
