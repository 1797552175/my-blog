package com.example.api.storyseed.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StorySeedUpdateRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank String openingMarkdown,
        String styleParams,
        String licenseType,
        boolean published
) {
}
