package com.example.api.inspiration.dto;

import java.time.Instant;

public record InspirationMessageResponse(
        String role,
        String content,
        Instant createdAt
) {
}
