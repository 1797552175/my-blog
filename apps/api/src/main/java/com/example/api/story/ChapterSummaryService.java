package com.example.api.story;

import com.example.api.ai.AiChatService;
import com.example.api.ai.AiDebugContext;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 作者章节预压缩：发布时调用 AI 压缩正文并存入 story_chapter_summaries。
 * 失败时降级为存原文并标记 is_fallback，调用方可根据返回值提示用户。
 */
@Service
public class ChapterSummaryService {

    private static final Logger logger = LoggerFactory.getLogger(ChapterSummaryService.class);

    private static final String COMPRESS_SYSTEM = "你是一位专业的小说编辑，擅长提炼情节要点。请将给定的章节正文压缩为200字以内的概要，保留关键情节和转折。只输出压缩后的文本，不要序号、标题或任何其他解释。";

    @Value("${ai.debug-log:false}")
    private boolean debugLogEnabled;

    private final StoryChapterSummaryRepository summaryRepository;
    private final AiChatService aiChatService;

    public ChapterSummaryService(StoryChapterSummaryRepository summaryRepository,
                                 AiChatService aiChatService) {
        this.summaryRepository = summaryRepository;
        this.aiChatService = aiChatService;
    }

    /**
     * 生成并保存本章预压缩。成功返回 null；失败时降级存原文并返回提示文案供前端展示。
     */
    @Transactional
    public String generateAndSave(StoryChapter chapter) {
        logger.info("开始预压缩章节: chapterId={}, published={}", 
                chapter != null ? chapter.getId() : null,
                chapter != null ? chapter.getPublished() : null);
        
        if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
            AiDebugContext.addLog("Precompress-ChapterId", String.valueOf(chapter != null ? chapter.getId() : "null"));
            AiDebugContext.addLog("Precompress-Published", String.valueOf(chapter != null ? chapter.getPublished() : "null"));
        }
        
        if (chapter == null || chapter.getId() == null) {
            logger.warn("预压缩失败: chapter为null或id为null");
            if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                AiDebugContext.addLog("Precompress-Error", "chapter为null或id为null");
            }
            return null;
        }
        String raw = chapter.getContentMarkdown();
        if (raw == null || raw.isBlank()) {
            logger.info("章节内容为空，保存空摘要: chapterId={}", chapter.getId());
            saveSummary(chapter, "", true);
            if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                AiDebugContext.addLog("Precompress-Status", "内容为空，保存空摘要");
            }
            return null;
        }

        if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
            AiDebugContext.addLog("Precompress-ContentLength", String.valueOf(raw.length()));
        }

        String compressed;
        try {
            logger.info("调用AI压缩: chapterId={}, contentLength={}", chapter.getId(), raw.length());
            compressed = aiChatService.chat(null, "【章节内容】\n\n" + raw, COMPRESS_SYSTEM);
            logger.info("AI压缩结果: chapterId={}, compressedLength={}", chapter.getId(), 
                    compressed != null ? compressed.length() : 0);
            
            if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                AiDebugContext.addLog("Precompress-AI-ResultLength", 
                        String.valueOf(compressed != null ? compressed.length() : 0));
            }
            
            if (compressed == null || compressed.isBlank()) {
                logger.warn("AI压缩返回空，降级存储原文: chapterId={}", chapter.getId());
                compressed = raw;
                saveSummary(chapter, compressed, true);
                if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                    AiDebugContext.addLog("Precompress-Status", "AI返回空，降级存储原文");
                    AiDebugContext.addLog("Precompress-IsFallback", "true");
                }
                return "本章预压缩失败，已用原文代替。";
            }
            compressed = compressed.trim();
            saveSummary(chapter, compressed, false);
            logger.info("预压缩成功: chapterId={}", chapter.getId());
            if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                AiDebugContext.addLog("Precompress-Status", "成功");
                AiDebugContext.addLog("Precompress-IsFallback", "false");
                AiDebugContext.addLog("Precompress-CompressedLength", String.valueOf(compressed.length()));
            }
            return null;
        } catch (Exception e) {
            logger.warn("预压缩异常: chapterId={}", chapter.getId(), e);
            saveSummary(chapter, raw, true);
            if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                AiDebugContext.addLog("Precompress-Status", "异常: " + e.getMessage());
                AiDebugContext.addLog("Precompress-IsFallback", "true");
            }
            return "本章预压缩失败，已用原文代替。";
        }
    }

    private void saveSummary(StoryChapter chapter, String content, boolean isFallback) {
        summaryRepository.findByChapterId(chapter.getId()).ifPresentOrElse(
                existing -> {
                    existing.setCompressedContent(content);
                    existing.setIsFallback(isFallback);
                    summaryRepository.save(existing);
                },
                () -> summaryRepository.save(new StoryChapterSummary(chapter, content, isFallback))
        );
    }

    /** 取本章预压缩内容；无则返回 null（调用方可用原文截断兜底） */
    @Transactional(readOnly = true)
    public String getCompressedContent(Long chapterId) {
        return summaryRepository.findByChapterId(chapterId)
                .map(StoryChapterSummary::getCompressedContent)
                .orElse(null);
    }
}
