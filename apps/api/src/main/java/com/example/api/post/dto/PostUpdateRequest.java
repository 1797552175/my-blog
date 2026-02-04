package com.example.api.post.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostUpdateRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank String contentMarkdown,
        boolean published,
        List<@Size(max = 64) String> tags
) {
}
