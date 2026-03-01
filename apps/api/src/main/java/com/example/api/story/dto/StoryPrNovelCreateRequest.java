package com.example.api.story.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoryPrNovelCreateRequest(
        @NotNull(message = "小说ID不能为空")
        Long storyId,

        @NotBlank(message = "标题不能为空")
        @Size(max = 200, message = "标题长度不能超过200字符")
        String title,

        @Size(max = 2000, message = "描述长度不能超过2000字符")
        String description,

        @NotNull(message = "起始章节不能为空")
        @Min(value = 1, message = "起始章节必须大于0")
        Integer fromChapterSortOrder
) {
}
