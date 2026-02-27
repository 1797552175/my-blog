package com.example.api.story.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

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
        Integer wordCount
) {
    /**
     * 写作类型枚举
     */
    public static final String TYPE_CONTINUE = "continue";
    public static final String TYPE_REWRITE = "rewrite";
    public static final String TYPE_EXPAND = "expand";
    public static final String TYPE_POLISH = "polish";
    public static final String TYPE_CUSTOM = "custom";
}
