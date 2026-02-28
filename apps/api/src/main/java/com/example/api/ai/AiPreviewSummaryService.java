package com.example.api.ai;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.example.api.ai.dto.AiPreviewResponse;

/**
 * AI预览章节预压缩服务
 * 异步为AI生成的预览章节生成摘要
 */
@Service
public class AiPreviewSummaryService {

    private static final Logger logger = LoggerFactory.getLogger(AiPreviewSummaryService.class);

    private static final String COMPRESS_SYSTEM = "你是一位专业的小说编辑，擅长提炼情节要点。请将给定的章节正文压缩为200字以内的概要，保留关键情节和转折。只输出压缩后的文本，不要序号、标题或任何其他解释。";

    private final AiChatService aiChatService;
    private final AiPreviewService aiPreviewService;

    public AiPreviewSummaryService(AiChatService aiChatService, 
                                    AiPreviewService aiPreviewService) {
        this.aiChatService = aiChatService;
        this.aiPreviewService = aiPreviewService;
    }

    /**
     * 异步生成并保存AI预览章节的摘要
     * 
     * @param forkId 阅读分支ID
     * @param chapterNumber 章节号
     */
    @Async
    public void generateAndSaveSummaryAsync(String forkId, Integer chapterNumber) {
        generateAndSaveSummary(forkId, chapterNumber);
    }

    /**
     * 同步生成并保存AI预览章节的摘要
     * 
     * @param forkId 阅读分支ID
     * @param chapterNumber 章节号
     * @return 是否成功
     */
    public boolean generateAndSaveSummary(String forkId, Integer chapterNumber) {
        logger.info("开始预压缩AI预览章节: forkId={}, chapterNumber={}", forkId, chapterNumber);
        
        try {
            // 获取章节列表
            List<AiPreviewResponse.AiPreviewChapter> chapters = aiPreviewService.getAiPreviewChapters(forkId);
            
            // 找到目标章节
            AiPreviewResponse.AiPreviewChapter targetChapter = chapters.stream()
                    .filter(ch -> ch.getChapterNumber().equals(chapterNumber))
                    .findFirst()
                    .orElse(null);
            
            if (targetChapter == null) {
                logger.warn("未找到目标章节: forkId={}, chapterNumber={}", forkId, chapterNumber);
                return false;
            }
            
            // 标记为正在生成摘要
            targetChapter.setSummaryGenerating(true);
            aiPreviewService.updateAiPreviewChapter(forkId, targetChapter);
            
            // 生成摘要
            String content = targetChapter.getContentMarkdown();
            if (content == null || content.isBlank()) {
                logger.info("章节内容为空，保存空摘要: forkId={}, chapterNumber={}", forkId, chapterNumber);
                targetChapter.setSummary("");
                targetChapter.setSummaryGenerating(false);
                aiPreviewService.updateAiPreviewChapter(forkId, targetChapter);
                return true;
            }
            
            String summary;
            try {
                logger.info("调用AI压缩: forkId={}, chapterNumber={}, contentLength={}", 
                        forkId, chapterNumber, content.length());
                summary = aiChatService.chat(null, "【章节内容】\n\n" + content, COMPRESS_SYSTEM);
                logger.info("AI压缩结果: forkId={}, chapterNumber={}, summaryLength={}", 
                        forkId, chapterNumber, summary != null ? summary.length() : 0);
                
                if (summary == null || summary.isBlank()) {
                    logger.warn("AI压缩返回空，降级存储原文前200字: forkId={}, chapterNumber={}", 
                            forkId, chapterNumber);
                    // 降级：取前200字
                    summary = content.length() > 200 ? content.substring(0, 200) : content;
                } else {
                    summary = summary.trim();
                }
            } catch (Exception e) {
                logger.error("AI压缩失败，降级存储原文前200字: forkId={}, chapterNumber={}", 
                        forkId, chapterNumber, e);
                // 降级：取前200字
                summary = content.length() > 200 ? content.substring(0, 200) : content;
            }
            
            // 保存摘要
            targetChapter.setSummary(summary);
            targetChapter.setSummaryGenerating(false);
            aiPreviewService.updateAiPreviewChapter(forkId, targetChapter);
            
            logger.info("预压缩完成: forkId={}, chapterNumber={}", forkId, chapterNumber);
            return true;
            
        } catch (Exception e) {
            logger.error("预压缩失败: forkId={}, chapterNumber={}", forkId, chapterNumber, e);
            return false;
        }
    }
}
