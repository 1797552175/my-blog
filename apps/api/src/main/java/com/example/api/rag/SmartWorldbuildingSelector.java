package com.example.api.rag;

import com.example.api.readerfork.StoryCommit;
import com.example.api.story.Story;
import com.example.api.storyseed.StoryCharacter;
import com.example.api.storyseed.StoryCharacterRepository;
import com.example.api.storyseed.StoryReadme;
import com.example.api.storyseed.StoryReadmeRepository;
import com.example.api.storyseed.StorySeed;
import com.example.api.storyseed.StoryTerm;
import com.example.api.storyseed.StoryTermRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class SmartWorldbuildingSelector {

    private static final Logger logger = LoggerFactory.getLogger(SmartWorldbuildingSelector.class);

    private final StoryCharacterRepository characterRepository;
    private final StoryTermRepository termRepository;
    private final StoryReadmeRepository readmeRepository;
    private final StoryCommitSummaryRepository summaryRepository;
    private final TokenBudgetManager tokenBudgetManager;
    private final ObjectMapper objectMapper;

    public SmartWorldbuildingSelector(
            StoryCharacterRepository characterRepository,
            StoryTermRepository termRepository,
            StoryReadmeRepository readmeRepository,
            StoryCommitSummaryRepository summaryRepository,
            TokenBudgetManager tokenBudgetManager,
            ObjectMapper objectMapper) {
        this.characterRepository = characterRepository;
        this.termRepository = termRepository;
        this.readmeRepository = readmeRepository;
        this.summaryRepository = summaryRepository;
        this.tokenBudgetManager = tokenBudgetManager;
        this.objectMapper = objectMapper;
    }

    public SelectedWorldbuilding selectRelevantWorldbuilding(
            StorySeed seed,
            Story story,
            List<StoryCommit> commits,
            int budget) {

        long startTime = System.currentTimeMillis();

        // 同时从 StorySeed 和 Story 获取数据（兼容新旧数据）
        List<StoryCharacter> allCharacters = new ArrayList<>();
        List<StoryTerm> allTerms = new ArrayList<>();
        
        // 尝试从 StorySeed 获取
        allCharacters.addAll(characterRepository
                .findByStorySeed_IdOrderBySortOrderAsc(seed.getId()));
        allTerms.addAll(termRepository
                .findByStorySeed_IdOrderBySortOrderAsc(seed.getId()));
        
        // 如果 Story 存在，从 Story 获取
        if (story != null) {
            allCharacters.addAll(characterRepository
                    .findByStory_IdOrderBySortOrderAsc(story.getId()));
            allTerms.addAll(termRepository
                    .findByStory_IdOrderBySortOrderAsc(story.getId()));
        }
        
        // 去重（基于ID）
        allCharacters = allCharacters.stream()
                .distinct()
                .collect(Collectors.toList());
        allTerms = allTerms.stream()
                .distinct()
                .collect(Collectors.toList());

        if (allCharacters.isEmpty() && allTerms.isEmpty()) {
            return new SelectedWorldbuilding(List.of(), List.of(), "");
        }

        Set<String> recentCharacterNames = extractRecentCharacterNames(commits);
        Set<String> recentLocationNames = extractRecentLocationNames(commits);
        Set<String> recentItemNames = extractRecentItemNames(commits);

        List<ScoredCharacter> scoredCharacters = allCharacters.stream()
                .map(c -> scoreCharacter(c, commits, recentCharacterNames))
                .sorted(Comparator.comparing(ScoredCharacter::score).reversed())
                .toList();

        List<ScoredTerm> scoredTerms = allTerms.stream()
                .map(t -> scoreTerm(t, commits, recentLocationNames, recentItemNames))
                .sorted(Comparator.comparing(ScoredTerm::score).reversed())
                .toList();

        List<StoryCharacter> selectedCharacters = new ArrayList<>();
        List<StoryTerm> selectedTerms = new ArrayList<>();
        int usedTokens = 0;

        for (ScoredCharacter sc : scoredCharacters) {
            int charTokens = estimateCharacterTokens(sc.character());
            if (usedTokens + charTokens <= budget * 0.6) {
                selectedCharacters.add(sc.character());
                usedTokens += charTokens;
            }
        }

        for (ScoredTerm st : scoredTerms) {
            int termTokens = estimateTermTokens(st.term());
            if (usedTokens + termTokens <= budget * 0.9) {
                selectedTerms.add(st.term());
                usedTokens += termTokens;
            }
        }

        String readmeContent = "";
        int readmeBudget = budget - usedTokens;
        if (readmeBudget > 200) {
            // 同时从 StorySeed 和 Story 获取 README（兼容新旧数据）
            StoryReadme readme = readmeRepository.findByStorySeed_Id(seed.getId()).orElse(null);
            if (readme == null && story != null) {
                readme = readmeRepository.findByStory_Id(story.getId()).orElse(null);
            }
            if (readme != null && readme.getContentMarkdown() != null) {
                readmeContent = tokenBudgetManager.truncateToBudget(
                        readme.getContentMarkdown(), readmeBudget);
            }
        }

        long duration = System.currentTimeMillis() - startTime;
        logger.debug("Selected {} characters, {} terms in {}ms (budget: {}, used: {})",
                selectedCharacters.size(), selectedTerms.size(), duration, budget, usedTokens);

        return new SelectedWorldbuilding(selectedCharacters, selectedTerms, readmeContent);
    }

    private ScoredCharacter scoreCharacter(StoryCharacter character, List<StoryCommit> commits,
                                           Set<String> recentCharacterNames) {
        double score = 0;

        if (recentCharacterNames.contains(character.getName())) {
            score += 50;
        }

        int mentionCount = countMentionsInCommits(character.getName(), commits);
        score += mentionCount * 5;

        if (character.getSortOrder() <= 3) {
            score += 20;
        }

        return new ScoredCharacter(character, score);
    }

    private ScoredTerm scoreTerm(StoryTerm term, List<StoryCommit> commits,
                                 Set<String> recentLocationNames, Set<String> recentItemNames) {
        double score = 0;

        if (recentLocationNames.contains(term.getName()) ||
                recentItemNames.contains(term.getName())) {
            score += 40;
        }

        int mentionCount = countMentionsInCommits(term.getName(), commits);
        score += mentionCount * 3;

        if ("place".equals(term.getTermType()) || "item".equals(term.getTermType())) {
            score += 10;
        }

        return new ScoredTerm(term, score);
    }

    private Set<String> extractRecentCharacterNames(List<StoryCommit> commits) {
        Set<String> names = new HashSet<>();

        List<Long> recentCommitIds = commits.stream()
                .sorted(Comparator.comparingInt(StoryCommit::getSortOrder).reversed())
                .limit(3)
                .map(StoryCommit::getId)
                .toList();

        List<StoryCommitSummary> recentSummaries = summaryRepository.findByCommitIdIn(recentCommitIds);

        for (StoryCommitSummary summary : recentSummaries) {
            if (summary.getCharactersInvolved() != null) {
                try {
                    JsonNode characters = objectMapper.readTree(summary.getCharactersInvolved());
                    if (characters.isArray()) {
                        for (JsonNode charNode : characters) {
                            if (charNode.has("name")) {
                                names.add(charNode.get("name").asText());
                            }
                        }
                    }
                } catch (Exception e) {
                    logger.warn("Failed to parse characters_involved JSON", e);
                }
            }
        }

        return names;
    }

    private Set<String> extractRecentLocationNames(List<StoryCommit> commits) {
        Set<String> names = new HashSet<>();

        List<Long> recentCommitIds = commits.stream()
                .sorted(Comparator.comparingInt(StoryCommit::getSortOrder).reversed())
                .limit(3)
                .map(StoryCommit::getId)
                .toList();

        List<StoryCommitSummary> recentSummaries = summaryRepository.findByCommitIdIn(recentCommitIds);

        for (StoryCommitSummary summary : recentSummaries) {
            if (summary.getLocationsInvolved() != null) {
                try {
                    JsonNode locations = objectMapper.readTree(summary.getLocationsInvolved());
                    if (locations.isArray()) {
                        for (JsonNode locNode : locations) {
                            if (locNode.isTextual()) {
                                names.add(locNode.asText());
                            }
                        }
                    }
                } catch (Exception e) {
                    logger.warn("Failed to parse locations_involved JSON", e);
                }
            }
        }

        return names;
    }

    private Set<String> extractRecentItemNames(List<StoryCommit> commits) {
        Set<String> names = new HashSet<>();

        List<Long> recentCommitIds = commits.stream()
                .sorted(Comparator.comparingInt(StoryCommit::getSortOrder).reversed())
                .limit(3)
                .map(StoryCommit::getId)
                .toList();

        List<StoryCommitSummary> recentSummaries = summaryRepository.findByCommitIdIn(recentCommitIds);

        for (StoryCommitSummary summary : recentSummaries) {
            if (summary.getItemsInvolved() != null) {
                try {
                    JsonNode items = objectMapper.readTree(summary.getItemsInvolved());
                    if (items.isArray()) {
                        for (JsonNode itemNode : items) {
                            if (itemNode.isTextual()) {
                                names.add(itemNode.asText());
                            }
                        }
                    }
                } catch (Exception e) {
                    logger.warn("Failed to parse items_involved JSON", e);
                }
            }
        }

        return names;
    }

    private int countMentionsInCommits(String name, List<StoryCommit> commits) {
        int count = 0;
        String lowerName = name.toLowerCase();
        for (StoryCommit commit : commits) {
            if (commit.getContentMarkdown() != null) {
                String content = commit.getContentMarkdown().toLowerCase();
                int index = 0;
                while ((index = content.indexOf(lowerName, index)) != -1) {
                    count++;
                    index += lowerName.length();
                }
            }
        }
        return count;
    }

    private int estimateCharacterTokens(StoryCharacter character) {
        int length = character.getName().length();
        if (character.getDescription() != null) {
            length += character.getDescription().length();
        }
        return length / 4 + 10;
    }

    private int estimateTermTokens(StoryTerm term) {
        int length = term.getName().length();
        if (term.getDefinition() != null) {
            length += term.getDefinition().length();
        }
        return length / 4 + 8;
    }

    public record SelectedWorldbuilding(
            List<StoryCharacter> characters,
            List<StoryTerm> terms,
            String readmeContent) {
    }

    private record ScoredCharacter(StoryCharacter character, double score) {
    }

    private record ScoredTerm(StoryTerm term, double score) {
    }
}
