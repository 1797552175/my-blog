package com.example.api.story.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 更新小说请求DTO
 */
public record StoryUpdateRequest(
        @NotBlank(message = "标题不能为空")
        @Size(max = 200, message = "标题最多200字符")
        String title,

        // AI创作相关字段
        String styleParams,
        String storySummary,
        String intentKeywords,

        // 开源协作字段
        boolean openSource,
        String openSourceLicense,

        boolean published,

        List<String> tags,

        Long inspirationId
) {
}
