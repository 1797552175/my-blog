package com.example.api.story.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record GenerateDirectionOptionsRequest(
        @NotNull(message = "小说ID不能为空") Long storyId,
        /** 限定前文范围：仅用 sortOrder 小于等于此值的章节预压缩（如 9 表示前9章）；不传则用全部 */
        Integer contextUpToSortOrder,
        /** AI预览章节摘要列表（用于阅读页面的AI续写） */
        List<AiPreviewChapterSummary> aiPreviewSummaries
) {
    /**
     * AI预览章节摘要信息
     */
    public static record AiPreviewChapterSummary(
            Integer chapterNumber,
            String title,
            String summary
    ) {
    }
}
