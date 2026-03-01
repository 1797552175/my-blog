package com.example.api.story.dto;

import java.time.Instant;

public record StoryPrNovelResponse(
        Long id,
        Long storyId,
        String storyTitle,
        String storySlug,
        Long forkId,
        Long creatorId,
        String creatorUsername,
        String title,
        String description,
        int fromChapterSortOrder,
        String status,
        Instant submittedAt,
        Long reviewedById,
        String reviewedByUsername,
        Instant reviewedAt,
        String reviewComment,
        int chapterCount,
        Instant createdAt,
        Instant updatedAt
) {
}
