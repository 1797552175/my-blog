package com.example.api.story.dto;

import java.util.Map;

/**
 * AI辅助写作响应
 */
public record AiWritingResponse(
        String content,
        String message,
        Map<String, Object> debugInfo
) {
    public AiWritingResponse(String content, String message) {
        this(content, message, null);
    }
}
