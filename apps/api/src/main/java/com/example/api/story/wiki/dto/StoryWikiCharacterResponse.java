package com.example.api.story.wiki.dto;

import java.time.Instant;

public record StoryWikiCharacterResponse(
        Long id,
        Long storyId,
        String name,
        String alias,
        String avatarUrl,
        String roleType,
        String age,
        String gender,
        String appearance,
        String personality,
        String background,
        String abilities,
        String relationships,
        String contentMarkdown,
        Integer sortOrder,
        Instant createdAt,
        Instant updatedAt
) {
}
