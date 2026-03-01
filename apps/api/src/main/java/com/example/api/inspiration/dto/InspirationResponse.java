package com.example.api.inspiration.dto;

import java.time.Instant;
import java.util.List;

public record InspirationResponse(
        Long id,
        String title,
        Instant createdAt,
        List<InspirationMessageResponse> messages,
        /** 小说方案快照（JSON），用于快速创作预填；无则为 null */
        String optionSnapshot
) {
}
