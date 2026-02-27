package com.example.api.story.dto;

import java.time.Instant;

/**
 * 贡献者响应DTO
 */
public record ContributorResponse(
        Long userId,
        String username,
        String avatarUrl,
        int chapterCount,      // 创作的章节数
        int wordCount,         // 创作的字数
        Instant firstContributionAt,  // 首次贡献时间
        Instant lastContributionAt    // 最后贡献时间
) {
}
