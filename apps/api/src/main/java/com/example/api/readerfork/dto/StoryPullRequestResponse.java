package com.example.api.readerfork.dto;

import java.time.Instant;

public record StoryPullRequestResponse(
        Long id,
        Long storySeedId,
        Long forkId,
        Long fromCommitId,
        String title,
        String description,
        String status,
        Long reviewedById,
        Instant createdAt,
        Instant updatedAt
) {
}
