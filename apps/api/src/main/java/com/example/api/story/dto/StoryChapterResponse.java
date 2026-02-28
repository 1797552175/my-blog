package com.example.api.story.dto;

import com.example.api.story.StoryChapter;

import java.time.Instant;

public record StoryChapterResponse(
        Long id,
        Long storyId,
        int sortOrder,
        String title,
        String contentMarkdown,
        Boolean published,
        Instant createdAt,
        Instant updatedAt
) {
    public static StoryChapterResponse fromEntity(StoryChapter c) {
        return new StoryChapterResponse(
                c.getId(),
                c.getStory() != null ? c.getStory().getId() : null,
                c.getSortOrder(),
                c.getTitle(),
                c.getContentMarkdown(),
                c.getPublished(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
