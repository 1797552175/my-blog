package com.example.api.story;

import com.example.api.ai.AiChatService;
import com.example.api.ai.AiDebugContext;
import com.example.api.common.ApiException;
import com.example.api.story.dto.GenerateDirectionOptionsResponse;
import com.example.api.story.dto.GenerateDirectionOptionsResponse.DirectionOption;
import com.example.api.storyseed.StoryCharacter;
import com.example.api.storyseed.StoryCharacterRepository;
import com.example.api.storyseed.StoryTerm;
import com.example.api.storyseed.StoryTermRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 根据小说设定与（可选）预压缩前文，生成 3 个故事走向选项。
 */
@Service
public class DirectionOptionsService {

    private static final String SYSTEM_WITH_HISTORY = "你是一位专业的小说编辑，擅长为续写提供故事走向建议。根据给定的小说设定与前文概要，生成3个不同的故事走向选项。每个选项包含简短标题（不超过20字）和一句说明（不超过80字）。只输出JSON数组，不要其他文字。格式：[{\"title\":\"标题\",\"description\":\"说明\"},{\"title\":\"...\",\"description\":\"...\"},{\"title\":\"...\",\"description\":\"...\"}]";
    private static final String SYSTEM_NO_HISTORY = "你是一位专业的小说编辑，擅长为小说开篇提供故事走向建议。根据给定的小说设定，生成3个不同的故事开篇/走向选项。每个选项包含简短标题（不超过20字）和一句说明（不超过80字）。只输出JSON数组，不要其他文字。格式：[{\"title\":\"标题\",\"description\":\"说明\"},{\"title\":\"...\",\"description\":\"...\"},{\"title\":\"...\",\"description\":\"...\"}]";

    @Value("${ai.debug-log:false}")
    private boolean debugLogEnabled;

    private final StoryRepository storyRepository;
    private final StoryChapterSummaryRepository summaryRepository;
    private final StoryCharacterRepository characterRepository;
    private final StoryTermRepository termRepository;
    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;

    public DirectionOptionsService(StoryRepository storyRepository,
                                   StoryChapterSummaryRepository summaryRepository,
                                   StoryCharacterRepository characterRepository,
                                   StoryTermRepository termRepository,
                                   AiChatService aiChatService,
                                   ObjectMapper objectMapper) {
        this.storyRepository = storyRepository;
        this.summaryRepository = summaryRepository;
        this.characterRepository = characterRepository;
        this.termRepository = termRepository;
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public GenerateDirectionOptionsResponse generateOptions(com.example.api.story.dto.GenerateDirectionOptionsRequest request) {
        Story story = storyRepository.findById(request.storyId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "小说不存在"));

        List<StoryChapterSummary> summaries = summaryRepository.findByChapter_Story_IdOrderByChapter_SortOrderAsc(story.getId());
        if (request.contextUpToSortOrder() != null && request.contextUpToSortOrder() > 0) {
            summaries = summaries.stream()
                    .filter(s -> s.getChapter() != null && s.getChapter().getSortOrder() <= request.contextUpToSortOrder())
                    .collect(Collectors.toList());
        }
        
        // 构建用户提示词，包含AI预览章节摘要
        String userPrompt = buildUserPrompt(story, summaries, request.aiPreviewSummaries());
        boolean hasContext = !summaries.isEmpty() || (request.aiPreviewSummaries() != null && !request.aiPreviewSummaries().isEmpty());
        String systemPrompt = hasContext ? SYSTEM_WITH_HISTORY : SYSTEM_NO_HISTORY;

        // 初始化调试上下文
        if (debugLogEnabled) {
            AiDebugContext.init();
        }

        String json = aiChatService.chat(null, userPrompt, systemPrompt);
        List<DirectionOption> options = parseOptions(json);

        // 收集调试信息
        Map<String, Object> debugInfo = null;
        if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
            debugInfo = new HashMap<>();
            debugInfo.put("storyId", request.storyId());
            debugInfo.put("hasHistory", hasContext);
            debugInfo.put("aiLogs", AiDebugContext.get().getLogs());
        }

        // 清理调试上下文
        AiDebugContext.clear();

        return new GenerateDirectionOptionsResponse(options, debugInfo);
    }

    private String buildUserPrompt(Story story, List<StoryChapterSummary> summaries, 
                                   List<com.example.api.story.dto.GenerateDirectionOptionsRequest.AiPreviewChapterSummary> aiPreviewSummaries) {
        StringBuilder sb = new StringBuilder();
        sb.append("【小说信息】\n");
        sb.append("标题：").append(story.getTitle()).append("\n");
        if (story.getStorySummary() != null && !story.getStorySummary().isBlank()) {
            sb.append("简介：").append(story.getStorySummary()).append("\n");
        }
        if (story.getStyleParams() != null && !story.getStyleParams().isBlank()) {
            sb.append("风格：").append(story.getStyleParams()).append("\n");
        }
        sb.append("\n");

        List<StoryCharacter> characters = characterRepository.findByStory_IdOrderBySortOrderAsc(story.getId());
        if (!characters.isEmpty()) {
            sb.append("【角色】\n");
            for (StoryCharacter c : characters) {
                sb.append("- ").append(c.getName()).append("：").append(c.getDescription() != null ? c.getDescription() : "").append("\n");
            }
            sb.append("\n");
        }
        List<StoryTerm> terms = termRepository.findByStory_IdOrderBySortOrderAsc(story.getId());
        if (!terms.isEmpty()) {
            sb.append("【术语】\n");
            for (StoryTerm t : terms) {
                sb.append("- ").append(t.getName()).append("：").append(t.getDefinition() != null ? t.getDefinition() : "").append("\n");
            }
            sb.append("\n");
        }

        boolean hasSummaries = !summaries.isEmpty();
        boolean hasAiPreviews = aiPreviewSummaries != null && !aiPreviewSummaries.isEmpty();
        
        if (hasSummaries || hasAiPreviews) {
            sb.append("【前文概要】\n");
            
            // 添加已发布章节的摘要
            if (hasSummaries) {
                for (StoryChapterSummary s : summaries) {
                    String title = s.getChapter() != null ? s.getChapter().getTitle() : "章";
                    sb.append(title).append("：").append(s.getCompressedContent()).append("\n\n");
                }
            }
            
            // 添加AI预览章节的摘要
            if (hasAiPreviews) {
                sb.append("【AI生成章节】\n");
                for (var aiSummary : aiPreviewSummaries) {
                    String summary = aiSummary.summary();
                    if (summary == null || summary.isBlank()) {
                        summary = "（内容加载中...）";
                    }
                    sb.append(aiSummary.title()).append("：").append(summary).append("\n\n");
                }
            }
            
            sb.append("请基于以上前文，生成3个合理的后续故事走向选项。\n");
        } else {
            sb.append("请基于以上设定，生成3个故事开篇/走向选项。\n");
        }

        return sb.toString();
    }

    private List<DirectionOption> parseOptions(String json) {
        List<DirectionOption> result = new ArrayList<>();
        if (json == null || json.isBlank()) {
            result.add(new DirectionOption("继续冒险", "主角继续探索未知"));
            result.add(new DirectionOption("寻找线索", "主角开始寻找关键线索"));
            result.add(new DirectionOption("面对挑战", "主角遇到新的挑战"));
            return result;
        }
        try {
            String trimmed = json.trim();
            int start = trimmed.indexOf('[');
            int end = trimmed.lastIndexOf(']');
            if (start >= 0 && end > start) {
                trimmed = trimmed.substring(start, end + 1);
            }
            JsonNode arr = objectMapper.readTree(trimmed);
            if (arr.isArray()) {
                for (JsonNode node : arr) {
                    // 确保 title 是字符串
                    String title = "";
                    if (node.has("title")) {
                        JsonNode titleNode = node.get("title");
                        if (titleNode.isTextual()) {
                            title = titleNode.asText("");
                        } else if (titleNode.isArray() && titleNode.size() > 0) {
                            // 如果 title 是数组，取第一个元素
                            title = titleNode.get(0).asText("");
                        } else {
                            title = titleNode.toString();
                        }
                    }
                    // 确保 description 是字符串
                    String desc = "";
                    if (node.has("description")) {
                        JsonNode descNode = node.get("description");
                        if (descNode.isTextual()) {
                            desc = descNode.asText("");
                        } else if (descNode.isArray() && descNode.size() > 0) {
                            desc = descNode.get(0).asText("");
                        } else {
                            desc = descNode.toString();
                        }
                    }
                    if (title.isBlank()) continue;
                    result.add(new DirectionOption(title.trim(), desc.trim()));
                    if (result.size() >= 3) break;
                }
            }
        } catch (Exception e) {
            // 解析失败时记录日志
            System.err.println("Failed to parse direction options: " + e.getMessage());
        }
        if (result.size() < 3) {
            while (result.size() < 3) {
                result.add(new DirectionOption("选项" + (result.size() + 1), ""));
            }
        }
        return result;
    }
}
