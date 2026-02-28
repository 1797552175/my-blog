package com.example.api.rag;

import com.example.api.rag.PrecompressedCacheService.CompressionLevel;
import com.example.api.rag.PrecompressedCacheService.PrecompressedHistory;
import com.example.api.rag.PrecompressedCacheService.EnhancedHistory;
import com.example.api.rag.QueryIntentAnalyzer.Complexity;
import com.example.api.rag.QueryIntentAnalyzer.QueryIntent;
import com.example.api.rag.QueryIntentAnalyzer.TimeRange;
import com.example.api.rag.SmartWorldbuildingSelector.SelectedWorldbuilding;
import com.example.api.readerfork.StoryCommit;
import com.example.api.storyseed.StoryOption;
import com.example.api.storyseed.StorySeed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 混合RAG Prompt构建器
 * 构建包含：小说概述 + RAG检索内容 + 世界观 + 人物角色设定的完整上下文
 */
@Component
public class HybridRAGPromptBuilder {

    private static final Logger logger = LoggerFactory.getLogger(HybridRAGPromptBuilder.class);

    private final PrecompressedCacheService cacheService;
    private final SmartWorldbuildingSelector worldbuildingSelector;
    private final TokenBudgetManager tokenBudgetManager;
    private final QueryIntentAnalyzer intentAnalyzer;
    private final RAGIntentKeywordsProperties keywordsProperties;

    public HybridRAGPromptBuilder(
            PrecompressedCacheService cacheService,
            SmartWorldbuildingSelector worldbuildingSelector,
            TokenBudgetManager tokenBudgetManager,
            QueryIntentAnalyzer intentAnalyzer,
            RAGIntentKeywordsProperties keywordsProperties) {
        this.cacheService = cacheService;
        this.worldbuildingSelector = worldbuildingSelector;
        this.tokenBudgetManager = tokenBudgetManager;
        this.intentAnalyzer = intentAnalyzer;
        this.keywordsProperties = keywordsProperties;
    }

    /**
     * 构建Prompt - 智能选择使用预压缩还是RAG
     * 
     * 上下文结构：
     * 1. 系统指令层
     * 2. 小说概述层（StorySeed.storySummary）
     * 3. 世界观设定层（角色、名词、README）
     * 4. 历史剧情层（预压缩/RAG检索）
     * 5. 读者选择层
     */
    public HybridPromptResult buildPrompt(
            StorySeed seed,
            com.example.api.story.Story story,
            List<StoryCommit> commits,
            StoryOption option,
            Long forkId) {

        long startTime = System.currentTimeMillis();

        // 1. 分析查询意图（传入小说概述和故事特定关键字）
        QueryIntent intent = intentAnalyzer.analyzeIntent(
                option, 
                buildContext(commits),
                seed.getStorySummary(),
                seed.getIntentKeywords()
        );
        logger.info("Query intent analyzed: {}", intent);

        // 2. 根据意图选择构建策略
        String prompt;
        BuildStrategy strategy;

        if (intent.shouldUsePrecompressed()) {
            // 使用预压缩（快速路径）
            prompt = buildWithPrecompressed(seed, story, commits, option, forkId, intent);
            strategy = BuildStrategy.PRECOMPRESSED;
        } else if (intent.complexity() == Complexity.MEDIUM) {
            // 混合模式（预压缩 + 关键细节）
            prompt = buildHybrid(seed, story, commits, option, forkId, intent);
            strategy = BuildStrategy.HYBRID;
        } else {
            // 完整RAG（精确检索）
            prompt = buildWithFullRAG(seed, story, commits, option, intent);
            strategy = BuildStrategy.FULL_RAG;
        }

        long duration = System.currentTimeMillis() - startTime;
        int totalTokens = tokenBudgetManager.countTokens(prompt);

        logger.info("Built prompt using {} strategy in {}ms, tokens: {}",
                strategy, duration, totalTokens);

        return new HybridPromptResult(prompt, strategy, intent, totalTokens, duration);
    }

    /**
     * 纯预压缩模式（最快）
     * 
     * 上下文：小说概述 + 世界观 + 预压缩历史 + 读者选择
     */
    private String buildWithPrecompressed(
            StorySeed seed,
            com.example.api.story.Story story,
            List<StoryCommit> commits,
            StoryOption option,
            Long forkId,
            QueryIntent intent) {

        StringBuilder prompt = new StringBuilder();

        // 1. 系统上下文
        prompt.append(buildSystemContext(seed));

        // 2. 小说概述层
        prompt.append(buildStorySummaryLayer(seed));

        // 3. 世界观层（智能筛选）
        prompt.append(buildWorldbuildingLayer(seed, story, commits));

        // 4. 历史剧情层（预压缩）
        CompressionLevel level = determineCompressionLevel(intent);
        int historyBudget = getAvailableBudget() - tokenBudgetManager.countTokens(prompt.toString());
        historyBudget = (int) (historyBudget * keywordsProperties.getPrompt().getBudget().getHistory());
        
        PrecompressedHistory history = cacheService.getPrecompressedHistory(
                forkId, commits, level, historyBudget);
        prompt.append(history.content());

        // 5. 读者选择层
        prompt.append(buildChoiceLayer(option));

        return prompt.toString();
    }

    /**
     * 混合模式（预压缩 + 关键细节）
     * 
     * 上下文：小说概述 + 世界观 + 预压缩历史 + 关键细节 + 读者选择
     */
    private String buildHybrid(
            StorySeed seed,
            com.example.api.story.Story story,
            List<StoryCommit> commits,
            StoryOption option,
            Long forkId,
            QueryIntent intent) {

        StringBuilder prompt = new StringBuilder();

        // 1. 系统上下文
        prompt.append(buildSystemContext(seed));

        // 2. 小说概述层
        prompt.append(buildStorySummaryLayer(seed));

        // 3. 世界观层（智能筛选）
        prompt.append(buildWorldbuildingLayer(seed, story, commits));

        // 4. 历史剧情层（预压缩 + 关键细节）
        int historyBudget = getAvailableBudget() - tokenBudgetManager.countTokens(prompt.toString());
        historyBudget = (int) (historyBudget * keywordsProperties.getPrompt().getBudget().getHistory());
        
        EnhancedHistory history = cacheService.getEnhancedHistory(
                forkId, commits, intent.entityTypes(), historyBudget);
        prompt.append(history.content());

        // 5. 读者选择层
        prompt.append(buildChoiceLayer(option));

        return prompt.toString();
    }

    /**
     * 完整RAG模式（最精确）
     * 
     * 上下文：小说概述 + 世界观 + 完整RAG检索 + 读者选择
     */
    private String buildWithFullRAG(
            StorySeed seed,
            com.example.api.story.Story story,
            List<StoryCommit> commits,
            StoryOption option,
            QueryIntent intent) {

        StringBuilder prompt = new StringBuilder();

        // 1. 系统上下文
        prompt.append(buildSystemContext(seed));

        // 2. 小说概述层
        prompt.append(buildStorySummaryLayer(seed));

        // 3. 世界观层（智能筛选）
        prompt.append(buildWorldbuildingLayer(seed, story, commits));

        // 4. 历史剧情层（分层加载完整内容）
        prompt.append(buildLayeredHistory(commits, intent));

        // 5. 读者选择层
        prompt.append(buildChoiceLayer(option));

        return prompt.toString();
    }

    /**
     * 构建系统上下文
     */
    private String buildSystemContext(StorySeed seed) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位专业的小说续写助手。请根据提供的小说概述、世界观设定、历史剧情和读者选择，续写下一段剧情。\n");
        sb.append("要求：\n");
        sb.append("1. 保持与小说概述的整体方向一致\n");
        sb.append("2. 遵循世界观设定和角色性格\n");
        sb.append("3. 情节连贯，逻辑合理\n");
        sb.append("4. 输出纯Markdown正文，不要输出标题或元信息\n");

        if (seed.getStyleParams() != null && !seed.getStyleParams().isBlank()) {
            sb.append("\n【风格要求】").append(seed.getStyleParams()).append("\n");
        }

        return sb.toString();
    }

    /**
     * 构建小说概述层
     * 
     * 这是新增的一层，让AI了解小说的整体方向
     */
    private String buildStorySummaryLayer(StorySeed seed) {
        StringBuilder sb = new StringBuilder();
        
        // 小说概述
        if (seed.getStorySummary() != null && !seed.getStorySummary().isBlank()) {
            sb.append("\n【小说概述】\n");
            sb.append(seed.getStorySummary()).append("\n");
        }
        
        // 故事开头（作为背景补充）
        if (seed.getOpeningMarkdown() != null && !seed.getOpeningMarkdown().isBlank()) {
            sb.append("\n【故事开头】\n");
            // 截取前500字作为背景
            String opening = seed.getOpeningMarkdown();
            if (opening.length() > 500) {
                opening = opening.substring(0, 500) + "...";
            }
            sb.append(opening).append("\n");
        }

        return sb.toString();
    }

    /**
     * 构建世界观层
     */
    private String buildWorldbuildingLayer(StorySeed seed, com.example.api.story.Story story, List<StoryCommit> commits) {
        int worldbuildingBudget = (int) (getAvailableBudget() * 
                keywordsProperties.getPrompt().getBudget().getWorldbuilding());
        
        SelectedWorldbuilding selected = worldbuildingSelector.selectRelevantWorldbuilding(
                seed, story, commits, worldbuildingBudget);

        StringBuilder sb = new StringBuilder();
        sb.append("\n【世界观设定】\n");

        // 角色设定
        if (!selected.characters().isEmpty()) {
            sb.append("\n角色设定：\n");
            for (var c : selected.characters()) {
                sb.append("- ").append(c.getName());
                if (c.getDescription() != null && !c.getDescription().isBlank()) {
                    String desc = c.getDescription();
                    if (desc.length() > 100) {
                        desc = desc.substring(0, 100) + "...";
                    }
                    sb.append("：").append(desc);
                }
                sb.append("\n");
            }
        }

        // 专有名词
        if (!selected.terms().isEmpty()) {
            sb.append("\n专有名词：\n");
            for (var t : selected.terms()) {
                sb.append("- ").append(t.getName());
                if (t.getDefinition() != null && !t.getDefinition().isBlank()) {
                    String def = t.getDefinition();
                    if (def.length() > 80) {
                        def = def.substring(0, 80) + "...";
                    }
                    sb.append("：").append(def);
                }
                sb.append("\n");
            }
        }

        // 故事设定
        if (!selected.readmeContent().isBlank()) {
            sb.append("\n故事设定：\n").append(selected.readmeContent()).append("\n");
        }

        return sb.toString();
    }

    /**
     * 构建分层历史（完整RAG使用）
     */
    private String buildLayeredHistory(List<StoryCommit> commits, QueryIntent intent) {
        if (commits.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("\n【历史剧情】\n");

        List<StoryCommit> sortedCommits = commits.stream()
                .sorted(Comparator.comparingInt(StoryCommit::getSortOrder))
                .collect(Collectors.toList());

        int totalCommits = sortedCommits.size();

        // 根据时间范围决定加载策略
        if (intent.timeRange() == TimeRange.RECENT) {
            // 只加载最近章节
            List<StoryCommit> recent = sortedCommits.subList(
                    Math.max(0, totalCommits - 3), totalCommits);
            for (StoryCommit commit : recent) {
                sb.append(formatFullChapter(commit));
            }
        } else if (intent.timeRange() == TimeRange.MEDIUM) {
            // 最近完整 + 中期摘要
            List<StoryCommit> recent = sortedCommits.subList(
                    Math.max(0, totalCommits - 2), totalCommits);
            for (StoryCommit commit : recent) {
                sb.append(formatFullChapter(commit));
            }

            sb.append("\n（前期概要）\n");
            List<StoryCommit> older = sortedCommits.subList(0, Math.max(0, totalCommits - 2));
            for (StoryCommit commit : older) {
                sb.append(String.format("第%d章：%s\n", commit.getSortOrder(),
                        truncateContent(commit.getContentMarkdown(), 100)));
            }
        } else {
            // 完整分层
            if (totalCommits <= 2) {
                for (StoryCommit commit : sortedCommits) {
                    sb.append(formatFullChapter(commit));
                }
            } else {
                List<StoryCommit> recent = sortedCommits.subList(
                        Math.max(0, totalCommits - 2), totalCommits);
                for (StoryCommit commit : recent) {
                    sb.append(formatFullChapter(commit));
                }

                sb.append("\n（前期概要）\n");
                List<StoryCommit> older = sortedCommits.subList(0, Math.max(0, totalCommits - 2));
                for (StoryCommit commit : older) {
                    sb.append(String.format("第%d章：%s\n", commit.getSortOrder(),
                            truncateContent(commit.getContentMarkdown(), 100)));
                }
            }
        }

        return sb.toString();
    }

    /**
     * 构建读者选择层
     */
    private String buildChoiceLayer(StoryOption option) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n【读者选择】\n");
        sb.append("选项：").append(option.getLabel()).append("\n");

        if (option.getInfluenceNotes() != null && !option.getInfluenceNotes().isBlank()) {
            sb.append("影响：").append(option.getInfluenceNotes()).append("\n");
        }

        sb.append("\n请续写下一段剧情（800-1200字），保持风格一致，情节连贯。输出纯Markdown正文。\n");

        return sb.toString();
    }

    /**
     * 确定压缩级别
     */
    private CompressionLevel determineCompressionLevel(QueryIntent intent) {
        return switch (intent.complexity()) {
            case SIMPLE -> CompressionLevel.ULTRA_SHORT;
            case MEDIUM -> CompressionLevel.SHORT;
            case COMPLEX -> CompressionLevel.MEDIUM;
        };
    }

    /**
     * 获取可用预算
     */
    private int getAvailableBudget() {
        return keywordsProperties.getPrompt().getBudget().getTotal() - 
               keywordsProperties.getPrompt().getBudget().getOutputReserve();
    }

    /**
     * 构建上下文（用于意图分析）
     */
    private String buildContext(List<StoryCommit> commits) {
        if (commits.isEmpty()) {
            return "故事刚开始";
        }

        StoryCommit lastCommit = commits.get(commits.size() - 1);
        return String.format("当前进行到第%d章，最新剧情：%s",
                lastCommit.getSortOrder(),
                truncateContent(lastCommit.getContentMarkdown(), 200));
    }

    private String formatFullChapter(StoryCommit commit) {
        return "\n第" + commit.getSortOrder() + "章：\n" + commit.getContentMarkdown() + "\n";
    }

    private String truncateContent(String content, int maxLength) {
        if (content == null || content.length() <= maxLength) {
            return content != null ? content : "";
        }
        return content.substring(0, maxLength) + "...";
    }

    public enum BuildStrategy {
        PRECOMPRESSED,  // 纯预压缩（最快）
        HYBRID,         // 混合模式（平衡）
        FULL_RAG        // 完整RAG（最精确）
    }

    public record HybridPromptResult(
            String prompt,
            BuildStrategy strategy,
            QueryIntent intent,
            int tokenCount,
            long buildTimeMs
    ) {
        public boolean isFastPath() {
            return strategy == BuildStrategy.PRECOMPRESSED;
        }

        public boolean isPrecise() {
            return strategy == BuildStrategy.FULL_RAG;
        }
    }
}
