package com.example.api.storyseed.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoryTermUpdateRequest(
        @NotBlank @Size(max = 32) String termType,
        @NotBlank @Size(max = 100) String name,
        @Size(max = 2000) String definition,
        @NotNull int sortOrder
) {
}
