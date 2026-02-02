package com.example.api.post.dto;

import java.time.Instant;

public record PostResponse(
        Long id,
        String title,
        String slug,
        String contentMarkdown,
        boolean published,
        String authorUsername,
        Instant createdAt,
        Instant updatedAt
) {
}
