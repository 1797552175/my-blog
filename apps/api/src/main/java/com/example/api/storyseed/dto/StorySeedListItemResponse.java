package com.example.api.storyseed.dto;

import java.time.Instant;

public record StorySeedListItemResponse(
        Long id,
        String title,
        String slug,
        String styleParams,
        String licenseType,
        boolean published,
        String authorUsername,
        Instant createdAt,
        Instant updatedAt
) {
}
