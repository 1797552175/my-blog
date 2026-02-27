package com.example.api.story.branch.dto;

import java.time.Instant;
import java.util.List;

/**
 * 章节节点响应（用于树形展示）
 */
public record ChapterNodeResponse(
        Long id,
        String title,
        int sortOrder,
        Long authorId,
        String authorName,
        Long parentId,
        Boolean isMainline,
        String branchName,
        int wordCount,
        Instant createdAt,
        List<ChapterNodeResponse> children
) {
}
