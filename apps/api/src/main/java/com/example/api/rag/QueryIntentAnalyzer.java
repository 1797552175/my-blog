package com.example.api.rag;

import com.example.api.ai.AiChatService;
import com.example.api.storyseed.StoryOption;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * 查询意图分析器
 * 支持从配置文件和故事实体读取关键字配置
 */
@Component
public class QueryIntentAnalyzer {

    private static final Logger logger = LoggerFactory.getLogger(QueryIntentAnalyzer.class);

    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;
    private final RAGIntentKeywordsProperties keywordsProperties;

    private static final String INTENT_ANALYSIS_PROMPT = """
            你是一位查询意图分析专家。请分析读者的选择意图，判断是否需要检索历史细节。
            
            分析维度：
            1. 查询复杂度: simple(简单) / medium(中等) / complex(复杂)
            2. 是否需要精确细节: true/false
            3. 涉及的时间范围: recent(近期) / medium(中期) / long(长期)
            4. 涉及的实体类型: character/location/item/organization/all
            5. 置信度: 0.0-1.0
            
            判断标准：
            - simple: 正常剧情推进，不需要特殊背景知识
            - medium: 需要了解一些背景，但摘要足够
            - complex: 需要精确细节，必须检索原文
            
            请按以下JSON格式输出：
            {
              "complexity": "simple/medium/complex",
              "requiresPreciseDetails": true/false,
              "timeRange": "recent/medium/long",
              "entityTypes": ["character", "location"],
              "confidence": 0.85,
              "reasoning": "判断理由"
            }
            """;

    public QueryIntentAnalyzer(
            AiChatService aiChatService,
            ObjectMapper objectMapper,
            RAGIntentKeywordsProperties keywordsProperties) {
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
        this.keywordsProperties = keywordsProperties;
    }

    /**
     * 分析查询意图（基础版本，使用系统配置）
     */
    public QueryIntent analyzeIntent(StoryOption option, String context) {
        return analyzeIntent(option, context, null, null);
    }

    /**
     * 分析查询意图（完整版本，支持故事特定配置）
     * 
     * @param option 读者选择
     * @param context 上下文
     * @param storySummary 小说概述
     * @param storyIntentKeywords 故事特定的意图关键字（JSON格式）
     */
    public QueryIntent analyzeIntent(
            StoryOption option, 
            String context,
            String storySummary,
            String storyIntentKeywords) {
        
        // 1. 快速规则判断（合并系统配置和故事特定配置）
        QueryIntent ruleBasedResult = analyzeByRules(option, storyIntentKeywords);

        // 2. 如果规则判断置信度高，直接返回
        double highConfidenceThreshold = keywordsProperties.getThresholds().getHighConfidence();
        if (ruleBasedResult.confidence() > highConfidenceThreshold) {
            logger.debug("Rule-based intent analysis: {}", ruleBasedResult);
            return ruleBasedResult;
        }

        // 3. 否则使用AI分析（传入小说概述增强上下文）
        try {
            QueryIntent aiResult = analyzeByAI(option, context, storySummary);
            logger.debug("AI-based intent analysis: {}", aiResult);
            return aiResult;
        } catch (Exception e) {
            logger.warn("AI intent analysis failed, falling back to rule-based", e);
            return ruleBasedResult;
        }
    }

    /**
     * 基于规则的分析（支持故事特定关键字）
     */
    private QueryIntent analyzeByRules(StoryOption option, String storyIntentKeywords) {
        String label = option.getLabel().toLowerCase();
        String influence = option.getInfluenceNotes() != null ?
                option.getInfluenceNotes().toLowerCase() : "";

        String combinedText = label + " " + influence;

        // 获取系统配置的关键字
        List<RAGIntentKeywordsProperties.KeywordConfig> systemSimpleKeywords = 
                keywordsProperties.getSimpleKeywords();
        List<RAGIntentKeywordsProperties.KeywordConfig> systemComplexKeywords = 
                keywordsProperties.getComplexKeywords();

        // 解析故事特定的关键字
        Map<String, List<String>> storyKeywords = parseStoryIntentKeywords(storyIntentKeywords);
        List<String> storySimpleKeywords = storyKeywords.getOrDefault("simple", List.of());
        List<String> storyComplexKeywords = storyKeywords.getOrDefault("complex", List.of());

        // 计算分数（系统关键字 + 故事关键字）
        int complexScore = calculateScoreFromConfig(combinedText, systemComplexKeywords);
        int simpleScore = calculateScoreFromConfig(combinedText, systemSimpleKeywords);
        
        // 加上故事特定关键字的分数（权重更高）
        complexScore += calculateScoreFromList(combinedText, storyComplexKeywords) * 2;
        simpleScore += calculateScoreFromList(combinedText, storySimpleKeywords);

        // 根据阈值判断复杂度
        int complexThreshold = keywordsProperties.getThresholds().getComplexScore();
        int simpleThreshold = keywordsProperties.getThresholds().getSimpleScore();
        
        Complexity complexity;
        boolean requiresPreciseDetails;
        double confidence;

        if (complexScore >= complexThreshold) {
            complexity = Complexity.COMPLEX;
            requiresPreciseDetails = true;
            confidence = 0.7 + Math.min(complexScore * 0.05, 0.25);
        } else if (complexScore > 0 || simpleScore < simpleThreshold) {
            complexity = Complexity.MEDIUM;
            requiresPreciseDetails = complexScore > simpleScore;
            confidence = 0.6 + Math.abs(complexScore - simpleScore) * 0.05;
        } else {
            complexity = Complexity.SIMPLE;
            requiresPreciseDetails = false;
            confidence = 0.8 + simpleScore * 0.03;
        }

        // 判断时间范围和实体类型
        TimeRange timeRange = determineTimeRange(combinedText);
        List<String> entityTypes = determineEntityTypes(combinedText);

        return new QueryIntent(
                complexity,
                requiresPreciseDetails,
                timeRange,
                entityTypes,
                Math.min(confidence, 0.95),
                "Rule-based analysis with config keywords"
        );
    }

    /**
     * 解析故事特定的意图关键字
     */
    private Map<String, List<String>> parseStoryIntentKeywords(String jsonKeywords) {
        Map<String, List<String>> result = new HashMap<>();
        
        if (jsonKeywords == null || jsonKeywords.isBlank()) {
            return result;
        }

        try {
            JsonNode root = objectMapper.readTree(jsonKeywords);
            
            root.fields().forEachRemaining(entry -> {
                String type = entry.getKey();
                List<String> keywords = new ArrayList<>();
                
                if (entry.getValue().isArray()) {
                    entry.getValue().forEach(node -> {
                        if (node.isTextual()) {
                            keywords.add(node.asText());
                        }
                    });
                }
                
                result.put(type, keywords);
            });
        } catch (Exception e) {
            logger.warn("Failed to parse story intent keywords: {}", jsonKeywords, e);
        }

        return result;
    }

    /**
     * 从配置计算分数
     */
    private int calculateScoreFromConfig(String text, List<RAGIntentKeywordsProperties.KeywordConfig> keywords) {
        int score = 0;
        for (RAGIntentKeywordsProperties.KeywordConfig keyword : keywords) {
            if (text.contains(keyword.getKeyword().toLowerCase())) {
                score += keyword.getWeight();
            }
        }
        return score;
    }

    /**
     * 从列表计算分数
     */
    private int calculateScoreFromList(String text, List<String> keywords) {
        int score = 0;
        for (String keyword : keywords) {
            if (text.contains(keyword.toLowerCase())) {
                score += 1;
            }
        }
        return score;
    }

    /**
     * 判断时间范围
     */
    private TimeRange determineTimeRange(String text) {
        // 检查长期关键字
        for (RAGIntentKeywordsProperties.KeywordConfig keyword : keywordsProperties.getTimeLongKeywords()) {
            if (text.contains(keyword.getKeyword())) {
                return TimeRange.LONG;
            }
        }

        // 检查中期关键字
        for (RAGIntentKeywordsProperties.KeywordConfig keyword : keywordsProperties.getTimeMediumKeywords()) {
            if (text.contains(keyword.getKeyword())) {
                return TimeRange.MEDIUM;
            }
        }

        return TimeRange.RECENT;
    }

    /**
     * 判断实体类型
     */
    private List<String> determineEntityTypes(String text) {
        List<String> types = new ArrayList<>();

        if (hasKeywordMatch(text, keywordsProperties.getEntityCharacterKeywords())) {
            types.add("character");
        }

        if (hasKeywordMatch(text, keywordsProperties.getEntityLocationKeywords())) {
            types.add("location");
        }

        if (hasKeywordMatch(text, keywordsProperties.getEntityItemKeywords())) {
            types.add("item");
        }

        if (hasKeywordMatch(text, keywordsProperties.getEntityOrganizationKeywords())) {
            types.add("organization");
        }

        if (types.isEmpty()) {
            types.add("all");
        }

        return types;
    }

    private boolean hasKeywordMatch(String text, List<RAGIntentKeywordsProperties.KeywordConfig> keywords) {
        for (RAGIntentKeywordsProperties.KeywordConfig keyword : keywords) {
            if (text.contains(keyword.getKeyword())) {
                return true;
            }
        }
        return false;
    }

    /**
     * AI深度分析（支持小说概述）
     */
    private QueryIntent analyzeByAI(StoryOption option, String context, String storySummary) throws Exception {
        StringBuilder userPrompt = new StringBuilder();
        
        userPrompt.append("【读者选择】\n");
        userPrompt.append("选项: ").append(option.getLabel()).append("\n");
        userPrompt.append("影响: ").append(
                option.getInfluenceNotes() != null ? option.getInfluenceNotes() : "无").append("\n");
        
        // 添加小说概述（如果有）
        if (storySummary != null && !storySummary.isBlank()) {
            userPrompt.append("\n【小说概述】\n").append(storySummary).append("\n");
        }
        
        userPrompt.append("\n【上下文】\n").append(context != null ? context : "无").append("\n");
        userPrompt.append("\n请分析这个选择的意图复杂度。");

        String jsonResponse = aiChatService.chat(
                List.of(), userPrompt.toString(), INTENT_ANALYSIS_PROMPT);

        if (jsonResponse == null || jsonResponse.isBlank()) {
            throw new IllegalStateException("Empty AI response");
        }

        return parseIntentResponse(jsonResponse);
    }

    private QueryIntent parseIntentResponse(String jsonResponse) throws Exception {
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

        Complexity complexity = Complexity.valueOf(
                getTextOrDefault(root, "complexity", "medium").toUpperCase()
        );

        boolean requiresPreciseDetails = root.has("requiresPreciseDetails") &&
                root.get("requiresPreciseDetails").asBoolean();

        TimeRange timeRange = TimeRange.valueOf(
                getTextOrDefault(root, "timeRange", "recent").toUpperCase()
        );

        List<String> entityTypes = List.of();
        if (root.has("entityTypes") && root.get("entityTypes").isArray()) {
            entityTypes = objectMapper.convertValue(
                    root.get("entityTypes"),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)
            );
        }

        double confidence = root.has("confidence") ?
                root.get("confidence").asDouble() : 0.7;

        String reasoning = getTextOrDefault(root, "reasoning", "AI analysis");

        return new QueryIntent(complexity, requiresPreciseDetails, timeRange, entityTypes, confidence, reasoning);
    }

    private String getTextOrDefault(JsonNode node, String fieldName, String defaultValue) {
        JsonNode field = node.get(fieldName);
        if (field != null && !field.isNull() && field.isTextual()) {
            return field.asText();
        }
        return defaultValue;
    }

    // ==================== 枚举和记录 ====================

    public enum Complexity {
        SIMPLE,     // 简单查询 - 直接用预压缩
        MEDIUM,     // 中等查询 - 预压缩 + 少量检索
        COMPLEX     // 复杂查询 - 完整RAG检索
    }

    public enum TimeRange {
        RECENT,     // 近期（最近3章）
        MEDIUM,     // 中期（4-10章）
        LONG        // 长期（10章以上）
    }

    public record QueryIntent(
            Complexity complexity,
            boolean requiresPreciseDetails,
            TimeRange timeRange,
            List<String> entityTypes,
            double confidence,
            String reasoning
    ) {
        public boolean shouldUsePrecompressed() {
            return complexity == Complexity.SIMPLE ||
                    (complexity == Complexity.MEDIUM && !requiresPreciseDetails);
        }

        public boolean shouldUseRag() {
            return complexity == Complexity.COMPLEX ||
                    (complexity == Complexity.MEDIUM && requiresPreciseDetails);
        }

        @Override
        public String toString() {
            return String.format("QueryIntent{complexity=%s, requiresPreciseDetails=%s, timeRange=%s, confidence=%.2f}",
                    complexity, requiresPreciseDetails, timeRange, confidence);
        }
    }
}
