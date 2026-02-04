package com.example.api.comment.dto;

import java.time.Instant;

public record CommentResponse(
        Long id,
        String authorName,
        Instant createdAt,
        String content
) {
}
