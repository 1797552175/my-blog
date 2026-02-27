package com.example.api.rag;

import com.example.api.readerfork.StoryCommit;
import com.example.api.storyseed.StorySeed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PrecompressedCacheService {

    private static final Logger logger = LoggerFactory.getLogger(PrecompressedCacheService.class);

    private final StoryCommitSummaryRepository summaryRepository;
    private final StoryEntityIndexRepository entityIndexRepository;
    private final TokenBudgetManager tokenBudgetManager;

    // 压缩级别配置
    public static final CompressionLevel DEFAULT_COMPRESSION = CompressionLevel.MEDIUM;
    public static final int MAX_PRECOMPRESSED_CHAPTERS = 20;

    public PrecompressedCacheService(
            StoryCommitSummaryRepository summaryRepository,
            StoryEntityIndexRepository entityIndexRepository,
            TokenBudgetManager tokenBudgetManager) {
        this.summaryRepository = summaryRepository;
        this.entityIndexRepository = entityIndexRepository;
        this.tokenBudgetManager = tokenBudgetManager;
    }

    /**
     * 获取预压缩的历史剧情（用于快速响应）
     */
    @Transactional(readOnly = true)
    public PrecompressedHistory getPrecompressedHistory(
            Long forkId,
            List<StoryCommit> commits,
            CompressionLevel level,
            int tokenBudget) {

        long startTime = System.currentTimeMillis();

        if (commits.isEmpty()) {
            return new PrecompressedHistory("", 0, 0);
        }

        // 获取所有摘要
        List<StoryCommitSummary> summaries = summaryRepository.findByForkIdOrderBySortOrder(forkId);

        StringBuilder historyBuilder = new StringBuilder();
        historyBuilder.append("\n【历史剧情概要】\n");

        int usedTokens = 0;
        int chapterCount = 0;

        // 按压缩级别选择摘要
        for (StoryCommit commit : commits) {
            if (chapterCount >= MAX_PRECOMPRESSED_CHAPTERS) {
                historyBuilder.append("\n...（更早章节已省略）\n");
                break;
            }

            Optional<StoryCommitSummary> summaryOpt = summaries.stream()
                    .filter(s -> s.getCommit().getId().equals(commit.getId()))
                    .findFirst();

            String chapterSummary;
            if (summaryOpt.isPresent()) {
                chapterSummary = extractSummaryByLevel(summaryOpt.get(), level);
            } else {
                // 如果没有预生成摘要，使用内容截断
                chapterSummary = createFallbackSummary(commit, level);
            }

            String formattedSummary = String.format("第%d章：%s\n",
                    commit.getSortOrder(), chapterSummary);

            int tokens = tokenBudgetManager.countTokens(formattedSummary);

            if (usedTokens + tokens <= tokenBudget) {
                historyBuilder.append(formattedSummary);
                usedTokens += tokens;
                chapterCount++;
            } else {
                break;
            }
        }

        String result = historyBuilder.toString();
        long duration = System.currentTimeMillis() - startTime;

        logger.debug("Built precompressed history in {}ms, chapters: {}, tokens: {}",
                duration, chapterCount, usedTokens);

        return new PrecompressedHistory(result, chapterCount, usedTokens);
    }

    /**
     * 获取增强型历史（预压缩 + 关键细节）
     */
    @Transactional(readOnly = true)
    public EnhancedHistory getEnhancedHistory(
            Long forkId,
            List<StoryCommit> commits,
            List<String> targetEntities,
            int tokenBudget) {

        long startTime = System.currentTimeMillis();

        // 1. 基础预压缩层（60%预算）
        int baseBudget = (int) (tokenBudget * 0.6);
        PrecompressedHistory baseHistory = getPrecompressedHistory(
                forkId, commits, CompressionLevel.SHORT, baseBudget);

        // 2. 关键细节层（40%预算）
        int detailBudget = tokenBudget - baseHistory.usedTokens();
        String keyDetails = extractKeyDetails(commits, targetEntities, detailBudget);

        String combined = baseHistory.content() + "\n【关键细节补充】\n" + keyDetails;
        int totalTokens = tokenBudgetManager.countTokens(combined);

        long duration = System.currentTimeMillis() - startTime;
        logger.debug("Built enhanced history in {}ms, total tokens: {}", duration, totalTokens);

        return new EnhancedHistory(combined, baseHistory.chapterCount(), totalTokens);
    }

    /**
     * 检查缓存完整性
     */
    @Transactional(readOnly = true)
    public CacheStatus checkCacheStatus(Long forkId, List<StoryCommit> commits) {
        if (commits.isEmpty()) {
            return new CacheStatus(true, 0, 0);
        }

        int totalCommits = commits.size();
        int cachedCommits = 0;

        for (StoryCommit commit : commits) {
            if (summaryRepository.existsByCommitId(commit.getId())) {
                cachedCommits++;
            }
        }

        boolean isComplete = cachedCommits == totalCommits;
        double coverage = totalCommits > 0 ? (double) cachedCommits / totalCommits : 0;

        return new CacheStatus(isComplete, cachedCommits, totalCommits, coverage);
    }

    /**
     * 获取缺失摘要的章节
     */
    @Transactional(readOnly = true)
    public List<StoryCommit> getMissingSummaries(List<StoryCommit> commits) {
        return commits.stream()
                .filter(c -> !summaryRepository.existsByCommitId(c.getId()))
                .collect(Collectors.toList());
    }

    /**
     * 根据压缩级别提取摘要
     */
    private String extractSummaryByLevel(StoryCommitSummary summary, CompressionLevel level) {
        return switch (level) {
            case ULTRA_SHORT -> summary.getUltraShortSummary();
            case SHORT -> summary.getShortSummary();
            case MEDIUM -> summary.getMediumSummary() != null ?
                    summary.getMediumSummary() : summary.getShortSummary();
        };
    }

    /**
     * 创建降级摘要
     */
    private String createFallbackSummary(StoryCommit commit, CompressionLevel level) {
        String content = commit.getContentMarkdown();
        if (content == null || content.isBlank()) {
            return "（无内容）";
        }

        int maxLength = switch (level) {
            case ULTRA_SHORT -> 50;
            case SHORT -> 200;
            case MEDIUM -> 500;
        };

        if (content.length() <= maxLength) {
            return content;
        }

        return content.substring(0, maxLength) + "...";
    }

    /**
     * 提取关键细节
     */
    private String extractKeyDetails(
            List<StoryCommit> commits,
            List<String> targetEntities,
            int tokenBudget) {

        if (targetEntities == null || targetEntities.isEmpty()) {
            return "（无特定细节需求）";
        }

        StringBuilder detailsBuilder = new StringBuilder();
        int usedTokens = 0;

        for (String entityName : targetEntities) {
            // 查找实体相关信息
            List<String> relevantSnippets = findEntitySnippets(commits, entityName);

            for (String snippet : relevantSnippets) {
                int tokens = tokenBudgetManager.countTokens(snippet);
                if (usedTokens + tokens <= tokenBudget) {
                    detailsBuilder.append(snippet).append("\n");
                    usedTokens += tokens;
                } else {
                    break;
                }
            }
        }

        return detailsBuilder.toString();
    }

    /**
     * 查找实体相关片段
     */
    private List<String> findEntitySnippets(List<StoryCommit> commits, String entityName) {
        List<String> snippets = new ArrayList<>();

        for (StoryCommit commit : commits) {
            String content = commit.getContentMarkdown();
            if (content == null || !content.contains(entityName)) {
                continue;
            }

            // 提取包含实体的上下文
            int index = content.indexOf(entityName);
            if (index >= 0) {
                int start = Math.max(0, index - 50);
                int end = Math.min(content.length(), index + entityName.length() + 50);
                String snippet = "..." + content.substring(start, end) + "...";
                snippets.add(String.format("第%d章: %s", commit.getSortOrder(), snippet));
            }
        }

        return snippets;
    }

    public enum CompressionLevel {
        ULTRA_SHORT,    // 50字
        SHORT,          // 200字
        MEDIUM          // 500字
    }

    public record PrecompressedHistory(
            String content,
            int chapterCount,
            int usedTokens
    ) {
    }

    public record EnhancedHistory(
            String content,
            int chapterCount,
            int totalTokens
    ) {
    }

    public record CacheStatus(
            boolean isComplete,
            int cachedCount,
            int totalCount,
            double coverage
    ) {
        public CacheStatus(boolean isComplete, int cachedCount, int totalCount) {
            this(isComplete, cachedCount, totalCount,
                    totalCount > 0 ? (double) cachedCount / totalCount : 0);
        }
    }
}
