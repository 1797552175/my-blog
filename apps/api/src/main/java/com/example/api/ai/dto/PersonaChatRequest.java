package com.example.api.ai.dto;

import java.util.List;

public record PersonaChatRequest(
        Long authorId,
        Long postId,
        List<ChatMessage> messages,
        String content
) {
}
