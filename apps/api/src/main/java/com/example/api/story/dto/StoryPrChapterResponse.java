package com.example.api.story.dto;

import java.time.Instant;

public record StoryPrChapterResponse(
        Long id,
        Long prNovelId,
        int sortOrder,
        String title,
        String contentMarkdown,
        String summary,
        int wordCount,
        Instant createdAt,
        Instant updatedAt
) {
}
