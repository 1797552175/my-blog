package com.example.api.story.dto;

import jakarta.validation.constraints.Size;

public record StoryChapterUpdateRequest(
        @Size(max = 200, message = "章节标题最多200字符")
        String title,

        String contentMarkdown,

        /** 新序号（从1开始），用于调整顺序 */
        Integer sortOrder
) {
}
