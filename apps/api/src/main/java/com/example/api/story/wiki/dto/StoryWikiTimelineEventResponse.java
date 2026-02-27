package com.example.api.story.wiki.dto;

import java.time.Instant;

public record StoryWikiTimelineEventResponse(
        Long id,
        Long storyId,
        String eventTime,
        String title,
        String description,
        String contentMarkdown,
        String relatedCharacters,
        Integer sortOrder,
        Instant createdAt,
        Instant updatedAt
) {
}
