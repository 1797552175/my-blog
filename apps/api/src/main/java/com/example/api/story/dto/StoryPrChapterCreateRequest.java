package com.example.api.story.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoryPrChapterCreateRequest(
        @NotNull(message = "章节序号不能为空")
        Integer sortOrder,

        @NotBlank(message = "标题不能为空")
        @Size(max = 200, message = "标题长度不能超过200字符")
        String title,

        String contentMarkdown,

        String summary
) {
}
