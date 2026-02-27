package com.example.api.storyseed.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StorySeedCreateRequest(
        @NotBlank @Size(max = 200) String title,
        String slug,
        @NotBlank String openingMarkdown,
        String styleParams,
        String licenseType,
        boolean published
) {
}
