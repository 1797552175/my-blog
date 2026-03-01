package com.example.api.ai.dto;

import java.util.List;

/**
 * 一个小说方案选项，与创建页表单字段对应
 */
public record NovelOptionItem(
        String title,
        String storySummary,
        List<String> tags,
        String styleId,
        String customStyle,
        String toneId,
        String viewpointId,
        String aiPrompt
) {
}
