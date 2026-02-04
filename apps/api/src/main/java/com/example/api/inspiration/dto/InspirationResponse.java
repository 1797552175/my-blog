package com.example.api.inspiration.dto;

import java.time.Instant;
import java.util.List;

public record InspirationResponse(
        Long id,
        String title,
        Instant createdAt,
        List<InspirationMessageResponse> messages
) {
}
