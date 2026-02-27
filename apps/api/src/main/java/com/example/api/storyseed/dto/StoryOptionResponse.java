package com.example.api.storyseed.dto;

public record StoryOptionResponse(
        Long id,
        Long branchPointId,
        String label,
        int sortOrder,
        String influenceNotes
) {
}
