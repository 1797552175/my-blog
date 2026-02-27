package com.example.api.story.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * 创建小说请求DTO
 * 所有小说都按章节存储，支持开源协作
 */
public record StoryCreateRequest(
        @NotBlank(message = "标题不能为空")
        @Size(max = 200, message = "标题最多200字符")
        String title,

        // 可选自定义 slug
        String slug,

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
