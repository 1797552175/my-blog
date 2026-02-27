package com.example.api.story.wiki.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StoryWikiTimelineEventCreateRequest(
        @NotBlank(message = "事件时间不能为空")
        @Size(max = 100, message = "事件时间不能超过100个字符")
        String eventTime,

        @NotBlank(message = "事件标题不能为空")
        @Size(max = 200, message = "事件标题不能超过200个字符")
        String title,

        String description,

        String contentMarkdown,

        @Size(max = 500, message = "相关角色不能超过500个字符")
        String relatedCharacters,

        Integer sortOrder
) {
}
