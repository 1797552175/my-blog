package com.example.api.rag;

import com.example.api.readerfork.StoryCommit;
import com.example.api.storyseed.StoryCharacter;
import com.example.api.storyseed.StoryCharacterRepository;
import com.example.api.storyseed.StoryOption;
import com.example.api.storyseed.StoryReadme;
import com.example.api.storyseed.StoryReadmeRepository;
import com.example.api.storyseed.StorySeed;
import com.example.api.storyseed.StoryTerm;
import com.example.api.storyseed.StoryTermRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class LayeredPromptBuilder {

    private static final Logger logger = LoggerFactory.getLogger(LayeredPromptBuilder.class);

    private final StoryCommitSummaryRepository summaryRepository;
    private final StoryCharacterRepository characterRepository;
    private final StoryTermRepository termRepository;
    private final StoryReadmeRepository readmeRepository;

    private static final int DEFAULT_TOKEN_BUDGET = 6000;
    private static final int OUTPUT_RESERVE = 2000;

    public LayeredPromptBuilder(
            StoryCommitSummaryRepository summaryRepository,
            StoryCharacterRepository characterRepository,
            StoryTermRepository termRepository,
            StoryReadmeRepository readmeRepository) {
        this.summaryRepository = summaryRepository;
        this.characterRepository = characterRepository;
        this.termRepository = termRepository;
        this.readmeRepository = readmeRepository;
    }

    public String buildPrompt(StorySeed seed, List<StoryCommit> commits, StoryOption option) {
        return buildPrompt(seed, commits, option, DEFAULT_TOKEN_BUDGET);
    }

    public String buildPrompt(StorySeed seed, List<StoryCommit> commits, StoryOption option, int tokenBudget) {
        long startTime = System.currentTimeMillis();
        int availableBudget = tokenBudget - OUTPUT_RESERVE;

        StringBuilder prompt = new StringBuilder();

        prompt.append(buildSystemContext(seed));

        int worldbuildingBudget = (int) (availableBudget * 0.25);
        prompt.append(buildWorldbuildingLayer(seed, commits, worldbuildingBudget));

        int historyBudget = (int) (availableBudget * 0.6);
        prompt.append(buildHistoryLayer(commits, historyBudget));

        prompt.append(buildChoiceLayer(option));

        long buildTime = System.currentTimeMillis() - startTime;
        logger.debug("Built prompt in {}ms, estimated tokens: {}", buildTime, estimateTokens(prompt.toString()));

        return prompt.toString();
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

    private String buildWorldbuildingLayer(StorySeed seed, List<StoryCommit> commits, int budget) {
        StringBuilder sb = new StringBuilder();
        sb.append("\n【世界观设定】\n");

        List<StoryCharacter> relevantCharacters = selectRelevantCharacters(seed, commits);
        if (!relevantCharacters.isEmpty()) {
            sb.append("\n角色设定：\n");
            for (StoryCharacter c : relevantCharacters) {
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

        List<StoryTerm> relevantTerms = selectRelevantTerms(seed, commits);
        if (!relevantTerms.isEmpty()) {
            sb.append("\n专有名词：\n");
            for (StoryTerm t : relevantTerms) {
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

        StoryReadme readme = readmeRepository.findByStorySeed_Id(seed.getId()).orElse(null);
        if (readme != null && readme.getContentMarkdown() != null && !readme.getContentMarkdown().isBlank()) {
            sb.append("\n故事设定：\n");
            String content = readme.getContentMarkdown();
            if (content.length() > 500) {
                content = content.substring(0, 500) + "...（略）";
            }
            sb.append(content).append("\n");
        }

        return sb.toString();
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

        if (totalCommits <= 3) {
            for (StoryCommit commit : sortedCommits) {
                sb.append("\n第").append(commit.getSortOrder()).append("章：\n");
                sb.append(commit.getContentMarkdown()).append("\n");
            }
        } else {
            List<StoryCommit> recentCommits = sortedCommits.subList(totalCommits - 3, totalCommits);
            List<StoryCommit> olderCommits = sortedCommits.subList(0, totalCommits - 3);

            sb.append("\n（近期剧情）\n");
            for (StoryCommit commit : recentCommits) {
                sb.append("\n第").append(commit.getSortOrder()).append("章：\n");
                sb.append(commit.getContentMarkdown()).append("\n");
            }

            if (!olderCommits.isEmpty()) {
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

                    sb.append("第").append(commit.getSortOrder()).append("章：");
                    if (summary != null && summary.getUltraShortSummary() != null) {
                        sb.append(summary.getUltraShortSummary());
                    } else {
                        String content = commit.getContentMarkdown();
                        if (content.length() > 100) {
                            content = content.substring(0, 100) + "...";
                        }
                        sb.append(content);
                    }
                    sb.append("\n");
                }
            }
        }

        return sb.toString();
    }

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

    private List<StoryCharacter> selectRelevantCharacters(StorySeed seed, List<StoryCommit> commits) {
        List<StoryCharacter> allCharacters = characterRepository
                .findByStorySeed_IdOrderBySortOrderAsc(seed.getId());

        if (allCharacters.isEmpty()) {
            return List.of();
        }

        if (commits.isEmpty()) {
            return allCharacters.stream().limit(5).collect(Collectors.toList());
        }

        List<Long> recentCommitIds = commits.stream()
                .sorted(Comparator.comparingInt(StoryCommit::getSortOrder).reversed())
                .limit(3)
                .map(StoryCommit::getId)
                .collect(Collectors.toList());

        List<StoryCommitSummary> recentSummaries = summaryRepository.findByCommitIdIn(recentCommitIds);

        List<String> recentCharacterNames = new ArrayList<>();
        for (StoryCommitSummary summary : recentSummaries) {
            if (summary.getCharactersInvolved() != null) {
            }
        }

        return allCharacters.stream()
                .filter(c -> recentCharacterNames.contains(c.getName()) ||
                        c.getSortOrder() <= 3)
                .limit(8)
                .collect(Collectors.toList());
    }

    private List<StoryTerm> selectRelevantTerms(StorySeed seed, List<StoryCommit> commits) {
        List<StoryTerm> allTerms = termRepository
                .findByStorySeed_IdOrderBySortOrderAsc(seed.getId());

        if (allTerms.isEmpty()) {
            return List.of();
        }

        return allTerms.stream()
                .limit(5)
                .collect(Collectors.toList());
    }

    private int estimateTokens(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        return text.length() / 2;
    }
}
