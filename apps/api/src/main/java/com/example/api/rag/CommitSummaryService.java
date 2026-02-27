package com.example.api.rag;

import com.example.api.ai.AiChatService;
import com.example.api.readerfork.StoryCommit;
import com.example.api.storyseed.StoryCharacter;
import com.example.api.storyseed.StoryCharacterRepository;
import com.example.api.storyseed.StoryReadmeRepository;
import com.example.api.storyseed.StoryTerm;
import com.example.api.storyseed.StoryTermRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class CommitSummaryService {

    private static final Logger logger = LoggerFactory.getLogger(CommitSummaryService.class);

    private final StoryCommitSummaryRepository summaryRepository;
    private final StoryCharacterRepository characterRepository;
    private final StoryTermRepository termRepository;
    private final StoryReadmeRepository readmeRepository;
    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;

    private static final String SUMMARY_SYSTEM_PROMPT = """
            你是一位专业的小说编辑，擅长提炼情节要点。
            请对提供的章节内容生成三级摘要和结构化信息。
            保持客观，准确提取关键信息。
            必须严格按照要求的JSON格式输出，不要添加任何其他内容。
            """;

    public CommitSummaryService(
            StoryCommitSummaryRepository summaryRepository,
            StoryCharacterRepository characterRepository,
            StoryTermRepository termRepository,
            StoryReadmeRepository readmeRepository,
            AiChatService aiChatService,
            ObjectMapper objectMapper) {
        this.summaryRepository = summaryRepository;
        this.characterRepository = characterRepository;
        this.termRepository = termRepository;
        this.readmeRepository = readmeRepository;
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
    }

    @Async
    @Transactional
    public void generateSummaryAsync(StoryCommit commit) {
        try {
            generateSummary(commit);
        } catch (Exception e) {
            logger.error("Failed to generate summary for commit {}", commit.getId(), e);
        }
    }

    @Transactional
    public StoryCommitSummary generateSummary(StoryCommit commit) {
        if (summaryRepository.existsByCommitId(commit.getId())) {
            logger.debug("Summary already exists for commit {}", commit.getId());
            return summaryRepository.findByCommitId(commit.getId()).orElseThrow();
        }

        String userPrompt = buildSummaryPrompt(commit);
        String jsonResponse = aiChatService.chat(List.of(), userPrompt, SUMMARY_SYSTEM_PROMPT);

        if (jsonResponse == null || jsonResponse.isBlank()) {
            logger.warn("Empty AI response for commit {}, using fallback summary", commit.getId());
            return createFallbackSummary(commit);
        }

        try {
            StoryCommitSummary summary = parseAndSaveSummary(jsonResponse, commit);
            logger.info("Generated summary for commit {}", commit.getId());
            return summary;
        } catch (Exception e) {
            logger.error("Failed to parse AI response for commit {}", commit.getId(), e);
            return createFallbackSummary(commit);
        }
    }

    private String buildSummaryPrompt(StoryCommit commit) {
        StringBuilder sb = new StringBuilder();

        Long storySeedId = commit.getFork().getStorySeed().getId();

        List<StoryCharacter> characters = characterRepository
                .findByStorySeed_IdOrderBySortOrderAsc(storySeedId);
        if (!characters.isEmpty()) {
            sb.append("【角色设定】\n");
            for (StoryCharacter c : characters) {
                sb.append("- ").append(c.getName()).append("：")
                        .append(c.getDescription() != null ? c.getDescription() : "").append("\n");
            }
            sb.append("\n");
        }

        List<StoryTerm> terms = termRepository
                .findByStorySeed_IdOrderBySortOrderAsc(storySeedId);
        if (!terms.isEmpty()) {
            sb.append("【专有名词】\n");
            for (StoryTerm t : terms) {
                sb.append("- ").append(t.getName()).append("：")
                        .append(t.getDefinition() != null ? t.getDefinition() : "").append("\n");
            }
            sb.append("\n");
        }

        readmeRepository.findByStorySeed_Id(storySeedId).ifPresent(readme -> {
            if (readme.getContentMarkdown() != null && !readme.getContentMarkdown().isBlank()) {
                sb.append("【故事设定】\n").append(readme.getContentMarkdown()).append("\n\n");
            }
        });

        sb.append("【章节内容】\n").append(commit.getContentMarkdown()).append("\n\n");

        sb.append("""
                请生成三级摘要和结构化信息，严格按以下JSON格式输出：
                {
                  "ultra_short_summary": "50字以内，一句话概括核心转折",
                  "short_summary": "200字以内，包含情节+情感变化",
                  "medium_summary": "500字以内，完整情节梗概",
                  "key_events": [
                    {"event": "事件描述", "type": "转折/冲突/揭示", "importance": 5}
                  ],
                  "characters_involved": [
                    {"name": "角色名", "action": "行为", "emotional_state": "情绪"}
                  ],
                  "locations_involved": [
                    {"name": "地点名", "scene_type": "场景类型"}
                  ],
                  "items_involved": [
                    {"name": "物品名", "significance": "重要性描述"}
                  ],
                  "emotional_tone": "情感基调，如：紧张/温馨/悬疑",
                  "chapter_function": "本章功能，如：铺垫/高潮/转折"
                }
                """);

        return sb.toString();
    }

    private StoryCommitSummary parseAndSaveSummary(String jsonResponse, StoryCommit commit) throws Exception {
        String cleanedJson = jsonResponse.trim();
        if (cleanedJson.startsWith("```json")) {
            cleanedJson = cleanedJson.substring(7);
        }
        if (cleanedJson.startsWith("```")) {
            cleanedJson = cleanedJson.substring(3);
        }
        if (cleanedJson.endsWith("```")) {
            cleanedJson = cleanedJson.substring(0, cleanedJson.length() - 3);
        }
        cleanedJson = cleanedJson.trim();

        JsonNode root = objectMapper.readTree(cleanedJson);

        StoryCommitSummary summary = new StoryCommitSummary();
        summary.setCommit(commit);

        summary.setUltraShortSummary(getTextOrDefault(root, "ultra_short_summary", "章节内容"));
        summary.setShortSummary(getTextOrDefault(root, "short_summary", summary.getUltraShortSummary()));
        summary.setMediumSummary(getTextOrDefault(root, "medium_summary", summary.getShortSummary()));

        summary.setKeyEvents(getJsonOrNull(root, "key_events"));
        summary.setCharactersInvolved(getJsonOrNull(root, "characters_involved"));
        summary.setLocationsInvolved(getJsonOrNull(root, "locations_involved"));
        summary.setItemsInvolved(getJsonOrNull(root, "items_involved"));

        summary.setEmotionalTone(getTextOrDefault(root, "emotional_tone", null));
        summary.setChapterFunction(getTextOrDefault(root, "chapter_function", null));

        int contentLength = commit.getContentMarkdown() != null ? commit.getContentMarkdown().length() : 0;
        summary.setTokenEstimate(contentLength / 2);

        int summaryLength = summary.getShortSummary().length();
        summary.setSummaryTokenEstimate(summaryLength / 2);

        return summaryRepository.save(summary);
    }

    private String getTextOrDefault(JsonNode root, String fieldName, String defaultValue) {
        JsonNode node = root.get(fieldName);
        if (node != null && !node.isNull() && node.isTextual()) {
            return node.asText();
        }
        return defaultValue;
    }

    private String getJsonOrNull(JsonNode root, String fieldName) throws Exception {
        JsonNode node = root.get(fieldName);
        if (node != null && !node.isNull()) {
            return objectMapper.writeValueAsString(node);
        }
        return null;
    }

    private StoryCommitSummary createFallbackSummary(StoryCommit commit) {
        String content = commit.getContentMarkdown();
        String ultraShort = content.length() > 50 ? content.substring(0, 50) + "..." : content;
        String shortSum = content.length() > 200 ? content.substring(0, 200) + "..." : content;

        StoryCommitSummary summary = new StoryCommitSummary(commit, ultraShort, shortSum);
        summary.setMediumSummary(content);

        int contentLength = content != null ? content.length() : 0;
        summary.setTokenEstimate(contentLength / 2);
        summary.setSummaryTokenEstimate(shortSum.length() / 2);

        return summaryRepository.save(summary);
    }

    @Transactional(readOnly = true)
    public StoryCommitSummary getSummary(Long commitId) {
        return summaryRepository.findByCommitId(commitId).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<StoryCommitSummary> getSummariesByFork(Long forkId) {
        return summaryRepository.findByForkIdOrderBySortOrder(forkId);
    }
}
