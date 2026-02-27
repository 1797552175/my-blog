package com.example.api.story.wiki.dto;

import com.example.api.story.wiki.StoryWikiPage;

import java.time.Instant;

public record WikiPageResponse(
        Long id,
        String slug,
        String title,
        String contentMarkdown,
        String category,
        String categoryDisplayName,
        Integer sortOrder,
        Instant createdAt,
        Instant updatedAt
) {
    public static WikiPageResponse fromEntity(StoryWikiPage page) {
        return new WikiPageResponse(
                page.getId(),
                page.getSlug(),
                page.getTitle(),
                page.getContentMarkdown(),
                page.getCategory() != null ? page.getCategory().name() : null,
                page.getCategory() != null ? page.getCategory().getDisplayName() : null,
                page.getSortOrder(),
                page.getCreatedAt(),
                page.getUpdatedAt()
        );
    }
}
