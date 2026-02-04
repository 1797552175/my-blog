package com.example.api.inspiration.dto;

import java.time.Instant;

public record InspirationListItemResponse(
        Long id,
        String title,
        Instant createdAt
) {
}
