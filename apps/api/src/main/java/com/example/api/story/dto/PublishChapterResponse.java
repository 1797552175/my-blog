package com.example.api.story.dto;

import java.util.Map;

/**
 * 发布章节接口返回：章节信息 + 可选预压缩失败提示 + 调试信息
 */
public record PublishChapterResponse(
        StoryChapterResponse chapter,
        String warning,
        Map<String, Object> debugInfo
) {
    public static PublishChapterResponse ok(StoryChapterResponse chapter) {
        return new PublishChapterResponse(chapter, null, null);
    }

    public static PublishChapterResponse withWarning(StoryChapterResponse chapter, String warning) {
        return new PublishChapterResponse(chapter, warning, null);
    }
    
    public static PublishChapterResponse withDebug(StoryChapterResponse chapter, Map<String, Object> debugInfo) {
        return new PublishChapterResponse(chapter, null, debugInfo);
    }
    
    public static PublishChapterResponse withWarningAndDebug(StoryChapterResponse chapter, String warning, Map<String, Object> debugInfo) {
        return new PublishChapterResponse(chapter, warning, debugInfo);
    }
}
