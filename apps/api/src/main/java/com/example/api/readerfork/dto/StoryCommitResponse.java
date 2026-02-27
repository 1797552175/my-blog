package com.example.api.readerfork.dto;

import java.time.Instant;

public record StoryCommitResponse(
        Long id,
        Long forkId,
        Long parentCommitId,
        Long branchPointId,
        Long optionId,
        String optionLabel,
        String contentMarkdown,
        int sortOrder,
        Instant createdAt,
        Instant updatedAt
) {
}
