package com.example.api.story.dto;

import jakarta.validation.constraints.Size;

public record StoryChapterCreateRequest(
        @Size(max = 200, message = "章节标题最多200字符")
        String title,

        String contentMarkdown,

        /** 插入位置（从1开始），不传则追加到末尾 */
        Integer sortOrder,

        /** 是否直接发布，不传则默认为false（草稿） */
        Boolean published
) {
}
