package com.example.api.story.dto;

import com.example.api.story.Story;
import com.example.api.user.User;

import java.time.Instant;
import java.util.List;

/**
 * 小说列表项响应DTO
 */
public record StoryListItemResponse(
        Long id,
        String title,
        String slug,
        boolean published,
        boolean hasContent,
        boolean isForkable,
        boolean isInteractive,
        boolean openSource,
        String openSourceLicense,
        Integer forkCount,
        Integer starCount,
        String storySummary,
        String authorUsername,
        List<String> tags,
        Instant createdAt
) {

    public static StoryListItemResponse fromEntity(Story story) {
        return fromEntity(story, story.hasContent());
    }

    /**
     * 列表场景使用：不访问 story.chapters，避免懒加载异常（open-in-view: false 时）
     */
    public static StoryListItemResponse fromEntity(Story story, boolean hasContent) {
        User author = story.getAuthor();
        List<String> tags = story.getTags();
        return new StoryListItemResponse(
                story.getId(),
                story.getTitle(),
                story.getSlug(),
                story.isPublished(),
                hasContent,
                story.isForkable(),
                true,
                Boolean.TRUE.equals(story.getOpenSource()),
                story.getOpenSourceLicense(),
                story.getForkCount() != null ? story.getForkCount() : 0,
                story.getStarCount() != null ? story.getStarCount() : 0,
                story.getStorySummary(),
                author != null ? author.getUsername() : null,
                tags != null ? tags : List.of(),
                story.getCreatedAt()
        );
    }
}
