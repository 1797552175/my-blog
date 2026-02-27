package com.example.api.story.dto;

import com.example.api.story.Story;
import com.example.api.storyseed.dto.StoryBranchPointResponse;
import com.example.api.user.User;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

/**
 * 小说详情响应DTO
 */
public record StoryResponse(
        Long id,
        String title,
        String slug,
        boolean published,
        boolean hasContent,
        boolean isForkable,

        // 开源协作字段
        boolean openSource,
        String openSourceLicense,
        Integer forkCount,
        Integer starCount,
        boolean starredByCurrentUser,

        // AI创作相关字段
        String styleParams,
        String storySummary,
        String intentKeywords,

        // 作者信息
        Long authorId,
        String authorUsername,

        // 关联信息
        Long inspirationId,
        String inspirationTitle,

        List<String> tags,

        // 分支点
        List<StoryBranchPointResponse> branchPoints,

        String createdAt,
        String updatedAt
) {

    public static StoryResponse fromEntity(Story story) {
        return fromEntity(story, false);
    }

    private static final DateTimeFormatter formatter = DateTimeFormatter.ISO_INSTANT;

    public static StoryResponse fromEntity(Story story, boolean starredByCurrentUser) {
        return new StoryResponse(
                story.getId(),
                story.getTitle(),
                story.getSlug(),
                story.isPublished(),
                story.hasContent(),
                story.isForkable(),
                story.getOpenSource() != null ? story.getOpenSource() : false,
                story.getOpenSourceLicense(),
                story.getForkCount() != null ? story.getForkCount() : 0,
                story.getStarCount() != null ? story.getStarCount() : 0,
                starredByCurrentUser,
                story.getStyleParams(),
                story.getStorySummary(),
                story.getIntentKeywords(),
                null, // 避免访问 author 字段
                null, // 避免访问 author 字段
                story.getInspiration() != null ? story.getInspiration().getId() : null,
                story.getInspiration() != null ? story.getInspiration().getTitle() : null,
                story.getTags() != null ? story.getTags() : Collections.emptyList(),
                Collections.emptyList(),
                story.getCreatedAt() != null ? formatter.format(story.getCreatedAt()) : null,
                story.getUpdatedAt() != null ? formatter.format(story.getUpdatedAt()) : null
        );
    }
}
