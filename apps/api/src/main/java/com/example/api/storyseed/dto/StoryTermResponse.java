package com.example.api.storyseed.dto;

public record StoryTermResponse(
        Long id,
        Long storySeedId,
        String termType,
        String name,
        String definition,
        int sortOrder
) {
}
