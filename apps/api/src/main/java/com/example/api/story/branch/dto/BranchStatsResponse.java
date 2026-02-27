package com.example.api.story.branch.dto;

/**
 * 分支统计响应
 */
public record BranchStatsResponse(
        int totalChapters,
        int mainlineChapters,
        int branchChapters,
        int branchPoints,
        int authorCount
) {
}
