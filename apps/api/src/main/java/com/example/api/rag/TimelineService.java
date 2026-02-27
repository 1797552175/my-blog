package com.example.api.rag;

import com.example.api.ai.AiChatService;
import com.example.api.readerfork.StoryCommit;
import com.example.api.readerfork.StoryCommitRepository;
import com.example.api.storyseed.StorySeed;
import com.fasterxml.jackson.databind.ObjectMapper;

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
public class TimelineService {

    private static final Logger logger = LoggerFactory.getLogger(TimelineService.class);

    private final StoryTimelineRepository timelineRepository;
    private final CommitTimelineMappingRepository mappingRepository;
    private final StoryCommitRepository commitRepository;
    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;

    private static final String TIMELINE_ANALYSIS_PROMPT = """
            你是一位时间线分析专家。请分析以下故事章节，判断是否存在"时间线分支"的可能性。
            
            分析维度：
            1. 关键选择点：是否存在重大决策或转折点
            2. 蝴蝶效应：当前事件是否可能产生多种后果
            3. 时间线稳定性：当前时间线是稳定还是脆弱
            
            请按以下JSON格式输出：
            {
              "has_branch_potential": true/false,
              "branch_description": "如果分支，描述可能的时间线",
              "probability": 0.0-1.0,
              "stability_score": 1-10,
              "key_factors": ["因素1", "因素2"]
            }
            """;

    public TimelineService(
            StoryTimelineRepository timelineRepository,
            CommitTimelineMappingRepository mappingRepository,
            StoryCommitRepository commitRepository,
            AiChatService aiChatService,
            ObjectMapper objectMapper) {
        this.timelineRepository = timelineRepository;
        this.mappingRepository = mappingRepository;
        this.commitRepository = commitRepository;
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public StoryTimeline createMainTimeline(StorySeed seed) {
        Optional<StoryTimeline> existing = timelineRepository
                .findByStorySeedIdAndIsMainTimelineTrue(seed.getId());

        if (existing.isPresent()) {
            return existing.get();
        }

        StoryTimeline timeline = new StoryTimeline(seed, "主线");
        timeline.setIsMainTimeline(true);
        timeline.setTimelineDescription("故事的主要时间线");
        timeline.setProbability(1.0);
        timeline.setStabilityScore(10);

        StoryTimeline saved = timelineRepository.save(timeline);
        logger.info("Created main timeline for story {}", seed.getId());

        return saved;
    }

    @Transactional
    public StoryTimeline createBranchTimeline(
            StorySeed seed,
            Long divergenceCommitId,
            String timelineName,
            String description) {

        StoryCommit divergenceCommit = commitRepository.findById(divergenceCommitId)
                .orElseThrow(() -> new IllegalArgumentException("Divergence commit not found"));

        StoryTimeline timeline = new StoryTimeline(seed, timelineName);
        timeline.setDivergenceCommitId(divergenceCommitId);
        timeline.setTimelineDescription(description);
        timeline.setBranchPoint("从第" + divergenceCommit.getSortOrder() + "章分支");
        timeline.setIsMainTimeline(false);
        timeline.setProbability(0.5);
        timeline.setStabilityScore(5);

        StoryTimeline saved = timelineRepository.save(timeline);

        copyCommitsToNewTimeline(saved, divergenceCommitId);

        logger.info("Created branch timeline {} from commit {}",
                saved.getId(), divergenceCommitId);

        return saved;
    }

    private void copyCommitsToNewTimeline(StoryTimeline newTimeline, Long divergenceCommitId) {
        StoryCommit divergenceCommit = commitRepository.findById(divergenceCommitId)
                .orElseThrow();

        Long forkId = divergenceCommit.getFork().getId();
        List<StoryCommit> allCommits = commitRepository
                .findByFork_IdOrderBySortOrderAsc(forkId);

        List<StoryCommit> commitsBeforeDivergence = allCommits.stream()
                .filter(c -> c.getSortOrder() <= divergenceCommit.getSortOrder())
                .sorted(Comparator.comparingInt(StoryCommit::getSortOrder))
                .collect(Collectors.toList());

        for (int i = 0; i < commitsBeforeDivergence.size(); i++) {
            StoryCommit commit = commitsBeforeDivergence.get(i);
            CommitTimelineMapping mapping = new CommitTimelineMapping(
                    newTimeline, commit, i + 1);

            if (commit.getId().equals(divergenceCommitId)) {
                mapping.setIsDivergencePoint(true);
                mapping.setDivergenceDescription("时间线分支点");
                mapping.setProbabilityAtThisPoint(0.5);
            }

            mappingRepository.save(mapping);
        }
    }

    @Transactional
    public void addCommitToTimeline(Long timelineId, StoryCommit commit) {
        StoryTimeline timeline = timelineRepository.findById(timelineId)
                .orElseThrow(() -> new IllegalArgumentException("Timeline not found"));

        Integer maxOrder = mappingRepository.findMaxTimelineOrderByTimelineId(timelineId);
        int newOrder = (maxOrder != null) ? maxOrder + 1 : 1;

        CommitTimelineMapping mapping = new CommitTimelineMapping(
                timeline, commit, newOrder);
        mappingRepository.save(mapping);

        logger.debug("Added commit {} to timeline {} at order {}",
                commit.getId(), timelineId, newOrder);
    }

    @Transactional(readOnly = true)
    public List<StoryCommit> getCommitsInTimeline(Long timelineId) {
        List<CommitTimelineMapping> mappings = mappingRepository
                .findByTimelineIdOrderByTimelineOrder(timelineId);

        return mappings.stream()
                .map(CommitTimelineMapping::getCommit)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StoryTimeline> getActiveTimelinesForStory(Long storySeedId) {
        return timelineRepository.findByStorySeedIdAndIsActiveTrue(storySeedId);
    }

    @Transactional(readOnly = true)
    public List<StoryTimeline> getAllTimelinesForStory(Long storySeedId) {
        return timelineRepository.findByStorySeedIdOrderByMainAndProbability(storySeedId);
    }

    @Transactional
    public TimelineAnalysis analyzeTimelinePotential(StoryCommit commit) {
        String chapterContent = commit.getContentMarkdown();
        if (chapterContent == null || chapterContent.isBlank()) {
            return new TimelineAnalysis(false, "", 0.0, 5, List.of());
        }

        String userPrompt = "请分析以下章节内容的时间线分支潜力：\n\n" + chapterContent;

        String jsonResponse = aiChatService.chat(List.of(), userPrompt, TIMELINE_ANALYSIS_PROMPT);

        if (jsonResponse == null || jsonResponse.isBlank()) {
            return new TimelineAnalysis(false, "", 0.0, 5, List.of());
        }

        try {
            return parseTimelineAnalysis(jsonResponse);
        } catch (Exception e) {
            logger.warn("Failed to parse timeline analysis for commit {}", commit.getId(), e);
            return new TimelineAnalysis(false, "", 0.0, 5, List.of());
        }
    }

    private TimelineAnalysis parseTimelineAnalysis(String jsonResponse) {
        try {
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

            com.fasterxml.jackson.databind.JsonNode root = objectMapper.readTree(cleanedJson);

            boolean hasBranchPotential = root.has("has_branch_potential") &&
                    root.get("has_branch_potential").asBoolean();
            String branchDescription = root.has("branch_description") ?
                    root.get("branch_description").asText() : "";
            double probability = root.has("probability") ?
                    root.get("probability").asDouble() : 0.0;
            int stabilityScore = root.has("stability_score") ?
                    root.get("stability_score").asInt() : 5;

            List<String> keyFactors = new ArrayList<>();
            if (root.has("key_factors") && root.get("key_factors").isArray()) {
                for (com.fasterxml.jackson.databind.JsonNode factor : root.get("key_factors")) {
                    keyFactors.add(factor.asText());
                }
            }

            return new TimelineAnalysis(hasBranchPotential, branchDescription,
                    probability, stabilityScore, keyFactors);
        } catch (Exception e) {
            logger.warn("Failed to parse timeline analysis JSON", e);
            return new TimelineAnalysis(false, "", 0.0, 5, List.of());
        }
    }

    @Transactional
    public void mergeTimelines(Long sourceTimelineId, Long targetTimelineId) {
        StoryTimeline source = timelineRepository.findById(sourceTimelineId)
                .orElseThrow(() -> new IllegalArgumentException("Source timeline not found"));
        StoryTimeline target = timelineRepository.findById(targetTimelineId)
                .orElseThrow(() -> new IllegalArgumentException("Target timeline not found"));

        source.setIsActive(false);
        timelineRepository.save(source);

        logger.info("Merged timeline {} into timeline {}", sourceTimelineId, targetTimelineId);
    }

    @Transactional(readOnly = true)
    public Optional<StoryTimeline> getMainTimeline(Long storySeedId) {
        return timelineRepository.findByStorySeedIdAndIsMainTimelineTrue(storySeedId);
    }

    public record TimelineAnalysis(
            boolean hasBranchPotential,
            String branchDescription,
            double probability,
            int stabilityScore,
            List<String> keyFactors) {
    }
}
