package com.example.api.storyseed.dto;

import java.util.List;

public record StoryBranchPointResponse(
        Long id,
        Long storyId,
        int sortOrder,
        String anchorText,
        List<StoryOptionResponse> options
) {
}
