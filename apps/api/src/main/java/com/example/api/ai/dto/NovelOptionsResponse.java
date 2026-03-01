package com.example.api.ai.dto;

import java.util.List;

/**
 * 首页「根据用户输入生成小说选项」响应。
 * 若 AI 判断需要先引导用户（如打招呼、没想好），则 guidanceText 有值、options 为空；
 * 若给出 3 个方案，则 guidanceText 为简短说明、options 为 3 个结构化选项。
 */
public record NovelOptionsResponse(
        String guidanceText,
        List<NovelOptionItem> options
) {
}
