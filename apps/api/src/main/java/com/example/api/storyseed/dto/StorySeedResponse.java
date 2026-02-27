package com.example.api.storyseed.dto;

import java.time.Instant;
import java.util.List;

public record StorySeedResponse(
        Long id,
        String title,
        String slug,
        String openingMarkdown,
        String styleParams,
        String licenseType,
        boolean published,
        Long authorId,
        String authorUsername,
        Instant createdAt,
        Instant updatedAt,
        List<StoryBranchPointResponse> branchPoints
) {
}
