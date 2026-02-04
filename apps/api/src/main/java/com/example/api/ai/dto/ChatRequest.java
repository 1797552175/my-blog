package com.example.api.ai.dto;

import java.util.List;

public record ChatRequest(
        List<ChatMessage> messages,
        String content
) {
}
