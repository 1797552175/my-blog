package com.example.api.readerfork.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record StoryPullRequestUpdateRequest(
        @NotBlank @Pattern(regexp = "open|merged|closed") String status
) {
}
