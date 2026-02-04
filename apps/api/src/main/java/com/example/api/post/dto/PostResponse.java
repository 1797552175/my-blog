package com.example.api.post.dto;

import java.time.Instant;
import java.util.List;

public record PostResponse(
        Long id,
        String title,
        String slug,
        String contentMarkdown,
        boolean published,
        List<String> tags,
        Long authorId,
        String authorUsername,
        boolean authorPersonaEnabled,
        Instant createdAt,
        Instant updatedAt
) {
}
