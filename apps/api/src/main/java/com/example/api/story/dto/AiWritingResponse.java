package com.example.api.story.dto;

/**
 * AI辅助写作响应
 */
public record AiWritingResponse(
        String content,
        String message
) {
}
