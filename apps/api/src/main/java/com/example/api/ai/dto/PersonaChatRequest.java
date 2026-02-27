package com.example.api.ai.dto;

import java.util.List;

public record PersonaChatRequest(
        Long authorId,
        Long storyId,
        List<ChatMessage> messages,
        String content
) {
}
