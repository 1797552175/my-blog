package com.example.api.storyseed.dto;

public record StoryCharacterResponse(
        Long id,
        Long storySeedId,
        String name,
        String description,
        int sortOrder
) {
}
