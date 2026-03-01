package com.example.api.ai.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * 首页「根据用户输入生成小说选项」请求
 */
public record NovelOptionsRequest(
        @NotNull String message,
        List<ChatMessage> history
) {
}
