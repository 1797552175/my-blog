package com.example.api.story.dto;

import java.time.Instant;

public record StoryPrSubmissionResponse(
        Long id,
        Long prNovelId,
        String prNovelTitle,
        Long storyId,
        String storyTitle,
        String storySlug,
        Long submitterId,
        String submitterUsername,
        String title,
        String description,
        String status,
        Instant submittedAt,
        Long reviewedById,
        String reviewedByUsername,
        Instant reviewedAt,
        String reviewComment,
        Instant createdAt,
        Instant updatedAt
) {
}
