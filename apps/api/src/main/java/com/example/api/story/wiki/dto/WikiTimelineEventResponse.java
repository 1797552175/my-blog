package com.example.api.story.wiki.dto;

import com.example.api.story.wiki.StoryWikiTimelineEvent;

import java.time.Instant;

public record WikiTimelineEventResponse(
        Long id,
        String eventTime,
        String title,
        String description,
        String contentMarkdown,
        String relatedCharacters,
        Integer sortOrder,
        Instant createdAt,
        Instant updatedAt
) {
    public static WikiTimelineEventResponse fromEntity(StoryWikiTimelineEvent event) {
        return new WikiTimelineEventResponse(
                event.getId(),
                event.getEventTime(),
                event.getTitle(),
                event.getDescription(),
                event.getContentMarkdown(),
                event.getRelatedCharacters(),
                event.getSortOrder(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
    }
}
