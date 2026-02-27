package com.example.api.story;

import com.example.api.ai.AiChatService;
import com.example.api.ai.dto.ChatMessage;
import com.example.api.common.ApiException;
import com.example.api.story.dto.AiWritingRequest;
import com.example.api.story.dto.AiWritingResponse;
import com.example.api.storyseed.StoryCharacter;
import com.example.api.storyseed.StoryCharacterRepository;
import com.example.api.storyseed.StoryTerm;
import com.example.api.storyseed.StoryTermRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AiWritingServiceImpl implements AiWritingService {

    private final StoryRepository storyRepository;
    private final StoryChapterRepository chapterRepository;
    private final AiChatService aiChatService;
    private final StoryCharacterRepository characterRepository;
    private final StoryTermRepository termRepository;

    public AiWritingServiceImpl(
            StoryRepository storyRepository,
            StoryChapterRepository chapterRepository,
            AiChatService aiChatService,
            StoryCharacterRepository characterRepository,
            StoryTermRepository termRepository) {
        this.storyRepository = storyRepository;
        this.chapterRepository = chapterRepository;
        this.aiChatService = aiChatService;
        this.characterRepository = characterRepository;
        this.termRepository = termRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AiWritingResponse write(String username, AiWritingRequest request) {
        Story story = storyRepository.findByIdAndAuthorUsername(request.storyId(), username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        String systemPrompt = buildSystemPrompt(story);
        String userPrompt = buildUserPrompt(request, story);

        String content = aiChatService.chat(null, userPrompt, systemPrompt);

        return new AiWritingResponse(content, "生成成功");
    }

    @Override
    @Transactional(readOnly = true)
    public void streamWrite(String username, AiWritingRequest request, StreamWriteCallback callback) {
        try {
            Story story = storyRepository.findByIdAndAuthorUsername(request.storyId(), username)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

            String systemPrompt = buildSystemPrompt(story);
            String userPrompt = buildUserPrompt(request, story);

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
     * 构建系统提示词
     */
    private String buildSystemPrompt(Story story) {
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
        StringBuilder sb = new StringBuilder();

        // 获取前文内容
        if (request.chapterId() != null) {
            StoryChapter currentChapter = chapterRepository.findById(request.chapterId()).orElse(null);
            if (currentChapter != null) {
                // 获取当前章节之前的内容
                List<StoryChapter> previousChapters = chapterRepository
                        .findByStoryIdOrderBySortOrderAsc(story.getId())
                        .stream()
                        .filter(ch -> ch.getSortOrder() < currentChapter.getSortOrder())
                        .collect(Collectors.toList());

                if (!previousChapters.isEmpty()) {
                    sb.append("【前文概要】\n");
                    for (StoryChapter ch : previousChapters) {
                        String content = ch.getContentMarkdown();
                        if (content != null && content.length() > 200) {
                            content = content.substring(0, 200) + "...";
                        }
                        sb.append(ch.getTitle()).append("：").append(content).append("\n\n");
                    }
                }

                // 当前章节已有内容
                if (request.content() != null && !request.content().isBlank()) {
                    sb.append("【当前章节已有内容】\n");
                    sb.append(request.content()).append("\n\n");
                }
            }
        }

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
                sb.append(request.prompt()).append("\n");
                break;
        }

        sb.append("\n请直接输出写作内容，不需要额外的解释。");

        return sb.toString();
    }
}
