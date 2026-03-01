package com.example.api.story.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoryPrSubmissionCreateRequest(
        @NotNull(message = "分支小说ID不能为空")
        Long prNovelId,

        @Size(max = 200, message = "标题长度不能超过200字符")
        String title,

        @Size(max = 2000, message = "描述长度不能超过2000字符")
        String description
) {
}
