package com.example.api.storyseed.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoryCharacterUpdateRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 5000) String description,
        @NotNull int sortOrder
) {
}
