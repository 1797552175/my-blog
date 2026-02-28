package com.example.api.rag;

import com.example.api.rag.TokenBudgetManager.BudgetAllocation;
import com.example.api.rag.SmartWorldbuildingSelector.SelectedWorldbuilding;
import com.example.api.readerfork.StoryCommit;
import com.example.api.storyseed.StoryCharacter;
import com.example.api.storyseed.StoryOption;
import com.example.api.storyseed.StorySeed;
import com.example.api.storyseed.StoryTerm;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class LayeredPromptBuilderV2 {

    private static final Logger logger = LoggerFactory.getLogger(LayeredPromptBuilderV2.class);

    private final StoryCommitSummaryRepository summaryRepository;
    private final SmartWorldbuildingSelector worldbuildingSelector;
    private final TokenBudgetManager tokenBudgetManager;

    public LayeredPromptBuilderV2(
            StoryCommitSummaryRepository summaryRepository,
            SmartWorldbuildingSelector worldbuildingSelector,
            TokenBudgetManager tokenBudgetManager) {
        this.summaryRepository = summaryRepository;
        this.worldbuildingSelector = worldbuildingSelector;
        this.tokenBudgetManager = tokenBudgetManager;
    }

    public String buildPrompt(StorySeed seed, com.example.api.story.Story story, List<StoryCommit> commits, StoryOption option) {
        return buildPrompt(seed, story, commits, option, TokenBudgetManager.DEFAULT_TOTAL_BUDGET);
    }

    public String buildPrompt(StorySeed seed, com.example.api.story.Story story, List<StoryCommit> commits, StoryOption option, int totalBudget) {
        long startTime = System.currentTimeMillis();

        BudgetAllocation budget = tokenBudgetManager.allocateBudget(totalBudget, TokenBudgetManager.OUTPUT_RESERVE);

        StringBuilder prompt = new StringBuilder();

        String systemContext = buildSystemContext(seed);
        prompt.append(systemContext);

        String worldbuildingLayer = buildWorldbuildingLayer(seed, story, commits, budget.getWorldbuildingBudget());
        prompt.append(worldbuildingLayer);

        String historyLayer = buildHistoryLayer(commits, budget.getHistoryBudget());
        prompt.append(historyLayer);

        String choiceLayer = buildChoiceLayer(option, budget.getChoiceBudget());
        prompt.append(choiceLayer);

        String finalPrompt = prompt.toString();
        int totalTokens = tokenBudgetManager.countTokens(finalPrompt);
        long buildTime = System.currentTimeMillis() - startTime;

        logger.info("Built prompt in {}ms, total tokens: {} (budget: {})", buildTime, totalTokens, budget);

        if (totalTokens > totalBudget - TokenBudgetManager.OUTPUT_RESERVE) {
            logger.warn("Prompt exceeds budget! Tokens: {}, Budget: {}", totalTokens, totalBudget);
            return tokenBudgetManager.truncateToBudget(finalPrompt, totalBudget - TokenBudgetManager.OUTPUT_RESERVE);
        }

        return finalPrompt;
    }

    private String buildSystemContext(StorySeed seed) {
        StringBuilder sb = new StringBuilder();
        sb.append("你是一位小说续写助手。请根据提供的世界观、历史剧情和读者选择，续写下一段剧情。\n");
        sb.append("保持风格一致，情节连贯，注意角色性格和世界观设定的准确性。\n");

        if (seed.getStyleParams() != null && !seed.getStyleParams().isBlank()) {
            sb.append("\n【风格要求】").append(seed.getStyleParams()).append("\n");
        }

        return sb.toString();
    }

    private String buildWorldbuildingLayer(StorySeed seed, com.example.api.story.Story story, List<StoryCommit> commits, int budget) {
        SelectedWorldbuilding selected = worldbuildingSelector.selectRelevantWorldbuilding(seed, story, commits, budget);

        StringBuilder sb = new StringBuilder();
        sb.append("\n【世界观设定】\n");

        List<StoryCharacter> characters = selected.characters();
        if (!characters.isEmpty()) {
            sb.append("\n角色设定：\n");
            for (StoryCharacter c : characters) {
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

        List<StoryTerm> terms = selected.terms();
        if (!terms.isEmpty()) {
            sb.append("\n专有名词：\n");
            for (StoryTerm t : terms) {
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

        String readme = selected.readmeContent();
        if (!readme.isBlank()) {
            sb.append("\n故事设定：\n").append(readme).append("\n");
        }

        String layer = sb.toString();
        int tokens = tokenBudgetManager.countTokens(layer);
        logger.debug("Worldbuilding layer: {} tokens (budget: {})", tokens, budget);

        return layer;
    }

    private String buildHistoryLayer(List<StoryCommit> commits, int budget) {
        if (commits.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("\n【历史剧情】\n");

        List<StoryCommit> sortedCommits = commits.stream()
                .sorted(Comparator.comparingInt(StoryCommit::getSortOrder))
                .collect(Collectors.toList());

        int totalCommits = sortedCommits.size();
        int usedTokens = 0;

        if (totalCommits <= 2) {
            for (StoryCommit commit : sortedCommits) {
                String chapterText = formatFullChapter(commit);
                int tokens = tokenBudgetManager.countTokens(chapterText);

                if (usedTokens + tokens <= budget * 0.8) {
                    sb.append(chapterText);
                    usedTokens += tokens;
                } else {
                    String truncated = "\n第" + commit.getSortOrder() + "章：（内容过长，已省略）\n";
                    sb.append(truncated);
                }
            }
        } else {
            List<StoryCommit> recentCommits = sortedCommits.subList(Math.max(0, totalCommits - 2), totalCommits);
            List<StoryCommit> olderCommits = sortedCommits.subList(0, Math.max(0, totalCommits - 2));

            sb.append("\n（近期剧情）\n");
            for (StoryCommit commit : recentCommits) {
                String chapterText = formatFullChapter(commit);
                int tokens = tokenBudgetManager.countTokens(chapterText);

                if (usedTokens + tokens <= budget * 0.5) {
                    sb.append(chapterText);
                    usedTokens += tokens;
                }
            }

            if (!olderCommits.isEmpty() && usedTokens < budget * 0.7) {
                sb.append("\n（前期剧情概要）\n");

                List<Long> olderCommitIds = olderCommits.stream()
                        .map(StoryCommit::getId)
                        .collect(Collectors.toList());
                List<StoryCommitSummary> summaries = summaryRepository.findByCommitIdIn(olderCommitIds);

                for (StoryCommit commit : olderCommits) {
                    StoryCommitSummary summary = summaries.stream()
                            .filter(s -> s.getCommit().getId().equals(commit.getId()))
                            .findFirst()
                            .orElse(null);

                    String summaryText;
                    if (summary != null && summary.getUltraShortSummary() != null) {
                        summaryText = "第" + commit.getSortOrder() + "章：" + summary.getUltraShortSummary() + "\n";
                    } else {
                        String content = commit.getContentMarkdown();
                        if (content != null && content.length() > 100) {
                            content = content.substring(0, 100) + "...";
                        }
                        summaryText = "第" + commit.getSortOrder() + "章：" + (content != null ? content : "") + "\n";
                    }

                    int tokens = tokenBudgetManager.countTokens(summaryText);
                    if (usedTokens + tokens <= budget) {
                        sb.append(summaryText);
                        usedTokens += tokens;
                    } else {
                        break;
                    }
                }
            }
        }

        String layer = sb.toString();
        int tokens = tokenBudgetManager.countTokens(layer);
        logger.debug("History layer: {} tokens (budget: {})", tokens, budget);

        return layer;
    }

    private String formatFullChapter(StoryCommit commit) {
        return "\n第" + commit.getSortOrder() + "章：\n" + commit.getContentMarkdown() + "\n";
    }

    private String buildChoiceLayer(StoryOption option, int budget) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n【读者选择】\n");
        sb.append("选项：").append(option.getLabel()).append("\n");

        if (option.getInfluenceNotes() != null && !option.getInfluenceNotes().isBlank()) {
            sb.append("影响：").append(option.getInfluenceNotes()).append("\n");
        }

        sb.append("\n请续写下一段剧情（800-1200字），保持风格一致，情节连贯。输出纯Markdown正文。\n");

        String layer = sb.toString();
        int tokens = tokenBudgetManager.countTokens(layer);
        logger.debug("Choice layer: {} tokens (budget: {})", tokens, budget);

        return layer;
    }
}
