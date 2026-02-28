package com.example.api.story;

import com.example.api.ai.AiChatService;
import com.example.api.ai.AiDebugContext;
import com.example.api.ai.dto.ChatMessage;
import com.example.api.common.ApiException;
import com.example.api.story.dto.AiWritingRequest;
import com.example.api.story.dto.AiWritingResponse;
import com.example.api.storyseed.StoryCharacter;
import com.example.api.storyseed.StoryCharacterRepository;
import com.example.api.storyseed.StoryTerm;
import com.example.api.storyseed.StoryTermRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AiWritingServiceImpl implements AiWritingService {

    private static final Logger logger = LoggerFactory.getLogger(AiWritingServiceImpl.class);

    @Value("${ai.debug-log:false}")
    private boolean debugLogEnabled;

    private final StoryRepository storyRepository;
    private final StoryChapterRepository chapterRepository;
    private final AiChatService aiChatService;
    private final StoryCharacterRepository characterRepository;
    private final StoryTermRepository termRepository;
    private final ChapterSummaryService chapterSummaryService;
    private final StoryChapterSummaryRepository chapterSummaryRepository;

    public AiWritingServiceImpl(
            StoryRepository storyRepository,
            StoryChapterRepository chapterRepository,
            AiChatService aiChatService,
            StoryCharacterRepository characterRepository,
            StoryTermRepository termRepository,
            ChapterSummaryService chapterSummaryService,
            StoryChapterSummaryRepository chapterSummaryRepository) {
        this.storyRepository = storyRepository;
        this.chapterRepository = chapterRepository;
        this.aiChatService = aiChatService;
        this.characterRepository = characterRepository;
        this.termRepository = termRepository;
        this.chapterSummaryService = chapterSummaryService;
        this.chapterSummaryRepository = chapterSummaryRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AiWritingResponse write(String username, AiWritingRequest request) {
        Story story = resolveStory(request, username);
        String systemPrompt = buildSystemPrompt(story, request);
        String userPrompt = buildUserPrompt(request, story);
        
        // 初始化调试上下文
        if (debugLogEnabled) {
            AiDebugContext.init();
        }
        
        String content = aiChatService.chat(null, userPrompt, systemPrompt);
        
        // 收集调试信息
        Map<String, Object> debugInfo = null;
        if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
            debugInfo = new HashMap<>();
            debugInfo.put("storyId", story != null ? story.getId() : null);
            debugInfo.put("type", request.type());
            debugInfo.put("aiLogs", AiDebugContext.get().getLogs());
        }
        
        // 清理调试上下文
        AiDebugContext.clear();
        
        return new AiWritingResponse(content, "生成成功", debugInfo);
    }

    @Override
    @Transactional(readOnly = true)
    public void streamWrite(String username, AiWritingRequest request, StreamWriteCallback callback) {
        try {
            Story story = resolveStory(request, username);
            String systemPrompt = buildSystemPrompt(story, request);
            String userPrompt = buildUserPrompt(request, story);

            // 调试日志：记录AI完整上下文
            if (debugLogEnabled) {
                logger.info("=== AI流式写作调试信息 ===");
                logger.info("StoryId: {}, Type: {}", request.storyId(), request.type());
                logger.info("SystemPrompt长度: {}", systemPrompt != null ? systemPrompt.length() : 0);
                logger.info("UserPrompt长度: {}", userPrompt != null ? userPrompt.length() : 0);
                logger.info("SystemPrompt:\n{}", systemPrompt);
                logger.info("UserPrompt:\n{}", userPrompt);
                logger.info("========================");
            }

            aiChatService.streamChat(null, userPrompt, systemPrompt, null, new AiChatService.StreamChatCallback() {
                @Override
                public void onChunk(String chunk) {
                    callback.onChunk(chunk);
                }

                @Override
                public void onComplete() {
                    callback.onComplete();
                }

                @Override
                public void onError(Throwable throwable) {
                    callback.onError(throwable);
                }
            });
        } catch (Exception e) {
            callback.onError(e);
        }
    }

    /**
     * 解析小说：用设定写时任意登录用户可调，否则仅作者
     */
    private Story resolveStory(AiWritingRequest request, String username) {
        if (AiWritingRequest.TYPE_FROM_SETTING.equals(request.type())) {
            return storyRepository.findById(request.storyId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
        }
        return storyRepository.findByIdAndAuthorUsername(request.storyId(), username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));
    }

    /**
     * 构建系统提示词（含前文概要与当前章已有内容时使用预压缩）
     */
    private String buildSystemPrompt(Story story, AiWritingRequest request) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位专业的小说写作助手，擅长根据作者的需求生成高质量的小说内容。\n\n");

        // 小说基本信息
        sb.append("【小说信息】\n");
        sb.append("标题：").append(story.getTitle()).append("\n");
        if (story.getStorySummary() != null && !story.getStorySummary().isBlank()) {
            sb.append("简介：").append(story.getStorySummary()).append("\n");
        }
        if (story.getStyleParams() != null && !story.getStyleParams().isBlank()) {
            sb.append("风格设定：").append(story.getStyleParams()).append("\n");
        }
        sb.append("\n");

        // 角色设定
        List<StoryCharacter> characters = characterRepository.findByStory_IdOrderBySortOrderAsc(story.getId());
        if (!characters.isEmpty()) {
            sb.append("【角色设定】\n");
            for (StoryCharacter ch : characters) {
                sb.append(ch.getName()).append("：").append(ch.getDescription()).append("\n");
            }
            sb.append("\n");
        }

        // 术语设定
        List<StoryTerm> terms = termRepository.findByStory_IdOrderBySortOrderAsc(story.getId());
        if (!terms.isEmpty()) {
            sb.append("【术语设定】\n");
            for (StoryTerm term : terms) {
                sb.append(term.getName()).append("：").append(term.getDefinition()).append("\n");
            }
            sb.append("\n");
        }

        // 前文概要（预压缩）与当前章节已有内容
        if (request.chapterId() != null) {
            StoryChapter currentChapter = chapterRepository.findById(request.chapterId()).orElse(null);
            if (currentChapter != null) {
                List<StoryChapter> previousChapters = chapterRepository
                        .findByStoryIdOrderBySortOrderAsc(story.getId())
                        .stream()
                        .filter(ch -> ch.getSortOrder() < currentChapter.getSortOrder())
                        .collect(Collectors.toList());
                if (!previousChapters.isEmpty()) {
                    sb.append("【前文概要】\n");
                    for (StoryChapter ch : previousChapters) {
                        String content = chapterSummaryService.getCompressedContent(ch.getId());
                        if (content == null || content.isBlank()) {
                            content = ch.getContentMarkdown();
                            if (content != null && content.length() > 200) {
                                content = content.substring(0, 200) + "...";
                            }
                        }
                        if (content != null && !content.isBlank()) {
                            sb.append(ch.getTitle()).append("：").append(content).append("\n\n");
                        }
                    }
                }
                if (request.content() != null && !request.content().isBlank()) {
                    sb.append("【当前章节已有内容】\n").append(request.content()).append("\n\n");
                }
            }
        } else if (AiWritingRequest.TYPE_FROM_SETTING.equals(request.type())) {
            // 智能续写：前文 = 已有章节的预压缩；若指定 nextChapterSortOrder 则只用 sortOrder < 该值的章（如续写第10章则用前9章）
            List<StoryChapterSummary> summaries = chapterSummaryRepository
                    .findByChapter_Story_IdOrderByChapter_SortOrderAsc(story.getId());
            Integer upTo = request.nextChapterSortOrder();
            if (upTo != null && upTo > 0) {
                summaries = summaries.stream()
                        .filter(s -> s.getChapter() != null && s.getChapter().getSortOrder() < upTo)
                        .collect(Collectors.toList());
            }
            
            boolean hasSummaries = !summaries.isEmpty();
            boolean hasAiPreviews = request.aiPreviewSummaries() != null && !request.aiPreviewSummaries().isEmpty();
            
            if (hasSummaries || hasAiPreviews) {
                sb.append("【前文概要】\n");
                
                // 添加已发布章节的摘要
                for (StoryChapterSummary sum : summaries) {
                    if (sum.getChapter() != null && sum.getCompressedContent() != null && !sum.getCompressedContent().isBlank()) {
                        sb.append(sum.getChapter().getTitle()).append("：").append(sum.getCompressedContent()).append("\n\n");
                    }
                }
                
                // 添加AI预览章节的摘要
                if (hasAiPreviews) {
                    sb.append("【AI生成章节】\n");
                    for (var aiSummary : request.aiPreviewSummaries()) {
                        String summary = aiSummary.summary();
                        if (summary == null || summary.isBlank()) {
                            summary = "（内容加载中...）";
                        }
                        sb.append(aiSummary.title()).append("：").append(summary).append("\n\n");
                    }
                }
            }
        }

        sb.append("【写作要求】\n");
        sb.append("1. 保持与小说整体风格一致\n");
        sb.append("2. 注意情节的连贯性和逻辑性\n");
        sb.append("3. 人物言行要符合其性格设定\n");
        sb.append("4. 使用中文写作，语言流畅自然\n");
        sb.append("5. 适当使用描写手法，增强画面感\n");

        return sb.toString();
    }

    /**
     * 构建用户提示词
     */
    private String buildUserPrompt(AiWritingRequest request, Story story) {
        if (AiWritingRequest.TYPE_FROM_SETTING.equals(request.type())) {
            int words = request.wordCount() != null && request.wordCount() > 0 ? request.wordCount() : 1000;
            StringBuilder sb = new StringBuilder();
            sb.append("【写作任务】\n请根据上述设定生成一章小说。\n");
            sb.append("章节标题规则：第一行只输出纯标题（例如「影子小队的日常」），不要带「第x章」、不要带「#」、不要带任何前缀或序号。空一行后输出正文。正文约").append(words).append("字。只输出标题和正文，不要其他解释。\n");
            if (request.selectedDirectionTitle() != null && !request.selectedDirectionTitle().isBlank()) {
                sb.append("\n【故事走向】\n").append(request.selectedDirectionTitle());
                if (request.selectedDirectionDescription() != null && !request.selectedDirectionDescription().isBlank()) {
                    sb.append("\n").append(request.selectedDirectionDescription());
                }
                sb.append("\n请按此走向续写。\n");
            }
            return sb.toString();
        }

        StringBuilder sb = new StringBuilder();

        // 前文概要与当前章节已有内容已放入 system prompt（含预压缩），此处只拼写作任务

        // 根据类型生成具体指令
        sb.append("【写作任务】\n");

        switch (request.type()) {
            case AiWritingRequest.TYPE_CONTINUE:
                sb.append("请根据上文续写小说内容");
                if (request.wordCount() != null && request.wordCount() > 0) {
                    sb.append("，约").append(request.wordCount()).append("字");
                }
                sb.append("。保持情节连贯，语言风格一致。\n");
                break;

            case AiWritingRequest.TYPE_REWRITE:
                sb.append("请对以下选中的内容进行改写：\n");
                sb.append(request.selectedText()).append("\n\n");
                sb.append("改写要求：").append(request.prompt() != null ? request.prompt() : "保持原意，但用不同的表达方式").append("\n");
                break;

            case AiWritingRequest.TYPE_EXPAND:
                sb.append("请对以下选中的内容进行扩写：\n");
                sb.append(request.selectedText()).append("\n\n");
                sb.append("扩写要求：").append(request.prompt() != null ? request.prompt() : "增加细节描写，丰富内容").append("\n");
                if (request.wordCount() != null && request.wordCount() > 0) {
                    sb.append("扩写到约").append(request.wordCount()).append("字\n");
                }
                break;

            case AiWritingRequest.TYPE_POLISH:
                sb.append("请对以下选中的内容进行润色：\n");
                sb.append(request.selectedText()).append("\n\n");
                sb.append("润色要求：优化语言表达，提升文学性，保持原意不变\n");
                break;

            case AiWritingRequest.TYPE_CUSTOM:
            default:
                if (request.prompt() != null && !request.prompt().isBlank()) {
                    sb.append(request.prompt()).append("\n");
                }
                break;
        }

        sb.append("\n请直接输出写作内容，不需要额外的解释。");

        return sb.toString();
    }
}
