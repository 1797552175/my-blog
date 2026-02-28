package com.example.api.story.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * AI辅助写作请求
 */
public record AiWritingRequest(
        @NotNull(message = "小说ID不能为空") Long storyId,
        Long chapterId,
        @NotBlank(message = "写作类型不能为空") String type,
        String content,
        String prompt,
        String selectedText,
        Integer wordCount,
        /** 智能续写时用户选择的故事走向：标题 */
        String selectedDirectionTitle,
        /** 智能续写时用户选择的故事走向：简短说明 */
        String selectedDirectionDescription,
        /** 智能续写「当前章」时传：要续写的章节序号，前文 = sortOrder 小于此值的预压缩（如 10 则用前9章） */
        Integer nextChapterSortOrder,
        /** AI预览章节摘要列表（阅读页智能续写时使用） */
        List<AiPreviewChapterSummary> aiPreviewSummaries
) {
    /**
     * AI预览章节摘要
     */
    public record AiPreviewChapterSummary(
            Integer chapterNumber,
            String title,
            String summary
    ) {}

    /**
     * 写作类型枚举
     */
    public static final String TYPE_CONTINUE = "continue";
    public static final String TYPE_REWRITE = "rewrite";
    public static final String TYPE_EXPAND = "expand";
    public static final String TYPE_POLISH = "polish";
    public static final String TYPE_CUSTOM = "custom";
    /** 仅根据系统设定（小说信息+角色+术语）生成标题+正文，任意登录用户可调 */
    public static final String TYPE_FROM_SETTING = "from_setting";
}
