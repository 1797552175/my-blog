package com.example.api.rag;

import com.example.api.readerfork.StoryCommit;
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
            List<StoryCommit> commits,
            int budget) {

        long startTime = System.currentTimeMillis();

        List<StoryCharacter> allCharacters = characterRepository
                .findByStorySeed_IdOrderBySortOrderAsc(seed.getId());
        List<StoryTerm> allTerms = termRepository
                .findByStorySeed_IdOrderBySortOrderAsc(seed.getId());

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
            StoryReadme readme = readmeRepository.findByStorySeed_Id(seed.getId()).orElse(null);
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
                            if (locNode.has("name")) {
                                names.add(locNode.get("name").asText());
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
                            if (itemNode.has("name")) {
                                names.add(itemNode.get("name").asText());
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
        for (StoryCommit commit : commits) {
            if (commit.getContentMarkdown() != null &&
                    commit.getContentMarkdown().contains(name)) {
                count++;
            }
        }
        return count;
    }

    private int estimateCharacterTokens(StoryCharacter character) {
        int length = character.getName().length();
        if (character.getDescription() != null) {
            length += Math.min(character.getDescription().length(), 100);
        }
        return length / 2 + 10;
    }

    private int estimateTermTokens(StoryTerm term) {
        int length = term.getName().length() + term.getTermType().length();
        if (term.getDefinition() != null) {
            length += Math.min(term.getDefinition().length(), 80);
        }
        return length / 2 + 10;
    }

    public record ScoredCharacter(StoryCharacter character, double score) {
    }

    public record ScoredTerm(StoryTerm term, double score) {
    }

    public record SelectedWorldbuilding(
            List<StoryCharacter> characters,
            List<StoryTerm> terms,
            String readmeContent) {
    }
}
