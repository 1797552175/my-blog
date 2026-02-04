package com.example.api.ai.dto;

/**
 * 分身对话响应。content 为助手回复；sessionId 仅在后端新生成会话时返回，供前端存储。
 */
public record PersonaChatResponse(String content, String sessionId) {

    public static PersonaChatResponse of(String content, String sessionId) {
        return new PersonaChatResponse(content, sessionId);
    }

    public static PersonaChatResponse of(String content) {
        return new PersonaChatResponse(content, null);
    }
}
