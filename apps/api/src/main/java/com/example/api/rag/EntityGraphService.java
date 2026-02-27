package com.example.api.rag;

import com.example.api.ai.AiChatService;
import com.example.api.readerfork.StoryCommit;
import com.example.api.storyseed.StorySeed;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class EntityGraphService {

    private static final Logger logger = LoggerFactory.getLogger(EntityGraphService.class);

    private final StoryEntityIndexRepository entityIndexRepository;
    private final EntityRelationshipRepository relationshipRepository;
    private final EntityAppearanceRepository appearanceRepository;
    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;

    private static final String RELATIONSHIP_EXTRACTION_PROMPT = """
            你是一位关系分析专家。请分析以下章节内容，提取实体之间的关系。
            
            关系类型包括：
            - family: 家族关系（父母、子女、兄弟姐妹等）
            - friend: 朋友关系
            - enemy: 敌对关系
            - ally: 盟友关系
            - master_servant: 主仆关系
            - romantic: 恋爱关系
            - ownership: 拥有关系（人物-物品）
            - location: 位置关系（人物/物品-地点）
            - membership: 成员关系（人物-组织）
            - other: 其他关系
            
            请按以下JSON格式输出：
            {
              "relationships": [
                {
                  "source": "实体A名称",
                  "target": "实体B名称",
                  "type": "关系类型",
                  "description": "关系描述",
                  "strength": 1-10
                }
              ]
            }
            """;

    public EntityGraphService(
            StoryEntityIndexRepository entityIndexRepository,
            EntityRelationshipRepository relationshipRepository,
            EntityAppearanceRepository appearanceRepository,
            AiChatService aiChatService,
            ObjectMapper objectMapper) {
        this.entityIndexRepository = entityIndexRepository;
        this.relationshipRepository = relationshipRepository;
        this.appearanceRepository = appearanceRepository;
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
    }

    @Async
    @Transactional
    public void extractAndBuildRelationshipsAsync(StoryCommit commit, StorySeed seed) {
        try {
            extractAndBuildRelationships(commit, seed);
        } catch (Exception e) {
            logger.error("Failed to extract relationships for commit {}", commit.getId(), e);
        }
    }

    @Transactional
    public void extractAndBuildRelationships(StoryCommit commit, StorySeed seed) {
        String chapterContent = commit.getContentMarkdown();
        if (chapterContent == null || chapterContent.isBlank()) {
            return;
        }

        List<StoryEntityIndex> storyEntities = entityIndexRepository.findByStorySeedId(seed.getId());
        if (storyEntities.size() < 2) {
            return;
        }

        String entitiesContext = buildEntitiesContext(storyEntities);

        String userPrompt = String.format("""
                【故事实体列表】
                %s
                
                【章节内容】
                %s
                """, entitiesContext, chapterContent);

        String jsonResponse = aiChatService.chat(List.of(), userPrompt, RELATIONSHIP_EXTRACTION_PROMPT);

        if (jsonResponse == null || jsonResponse.isBlank()) {
            logger.warn("Empty AI response for relationship extraction, commit {}", commit.getId());
            return;
        }

        try {
            parseAndSaveRelationships(jsonResponse, storyEntities, commit);
            logger.info("Extracted relationships for commit {}", commit.getId());
        } catch (Exception e) {
            logger.error("Failed to parse relationship extraction response for commit {}", commit.getId(), e);
        }
    }

    private String buildEntitiesContext(List<StoryEntityIndex> entities) {
        StringBuilder sb = new StringBuilder();

        Map<String, List<StoryEntityIndex>> byType = new HashMap<>();
        for (StoryEntityIndex entity : entities) {
            byType.computeIfAbsent(entity.getEntityType(), k -> new ArrayList<>()).add(entity);
        }

        byType.forEach((type, list) -> {
            sb.append(type).append(": ");
            sb.append(list.stream()
                    .map(StoryEntityIndex::getEntityName)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse(""));
            sb.append("\n");
        });

        return sb.toString();
    }

    private void parseAndSaveRelationships(String jsonResponse, List<StoryEntityIndex> storyEntities,
                                           StoryCommit commit) throws Exception {
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

        if (!root.has("relationships") || !root.get("relationships").isArray()) {
            return;
        }

        Map<String, StoryEntityIndex> entityMap = new HashMap<>();
        for (StoryEntityIndex entity : storyEntities) {
            entityMap.put(entity.getEntityName(), entity);
        }

        for (JsonNode relNode : root.get("relationships")) {
            processRelationship(relNode, entityMap, commit);
        }
    }

    private void processRelationship(JsonNode relNode, Map<String, StoryEntityIndex> entityMap,
                                     StoryCommit commit) {
        String sourceName = getTextOrDefault(relNode, "source", null);
        String targetName = getTextOrDefault(relNode, "target", null);
        String type = getTextOrDefault(relNode, "type", "other");

        if (sourceName == null || targetName == null || sourceName.equals(targetName)) {
            return;
        }

        StoryEntityIndex sourceEntity = entityMap.get(sourceName);
        StoryEntityIndex targetEntity = entityMap.get(targetName);

        if (sourceEntity == null || targetEntity == null) {
            return;
        }

        Optional<EntityRelationship> existing = relationshipRepository
                .findBySourceAndTarget(sourceEntity.getId(), targetEntity.getId());

        EntityRelationship relationship;
        if (existing.isPresent()) {
            relationship = existing.get();
            relationship.setStrengthScore(relationship.getStrengthScore() + 1);
        } else {
            relationship = new EntityRelationship(sourceEntity, targetEntity, type);
            relationship.setFirstAppearanceCommitId(commit.getId());
            relationship.setStrengthScore(getIntOrDefault(relNode, "strength", 5));
        }

        relationship.setRelationshipDescription(getTextOrDefault(relNode, "description", ""));
        relationship.setLastUpdatedCommitId(commit.getId());
        relationship.setIsActive(true);

        relationshipRepository.save(relationship);
    }

    @Transactional(readOnly = true)
    public EntityGraph buildEntityGraph(Long storySeedId) {
        List<StoryEntityIndex> entities = entityIndexRepository.findByStorySeedId(storySeedId);
        List<EntityRelationship> relationships = relationshipRepository.findActiveByStorySeedId(storySeedId);

        List<EntityNode> nodes = entities.stream()
                .map(this::convertToNode)
                .toList();

        List<RelationshipEdge> edges = relationships.stream()
                .map(this::convertToEdge)
                .toList();

        return new EntityGraph(nodes, edges);
    }

    @Transactional(readOnly = true)
    public EntityGraph buildEntityGraphForCommit(Long commitId) {
        List<EntityAppearance> appearances = appearanceRepository.findByCommitId(commitId);

        Set<Long> entityIds = new HashSet<>();
        for (EntityAppearance appearance : appearances) {
            entityIds.add(appearance.getEntity().getId());
        }

        List<StoryEntityIndex> entities = entityIndexRepository.findAllById(entityIds);
        List<EntityRelationship> relationships = new ArrayList<>();

        for (Long entityId : entityIds) {
            relationships.addAll(relationshipRepository.findByEntityId(entityId));
        }

        List<EntityNode> nodes = entities.stream()
                .map(this::convertToNode)
                .toList();

        List<RelationshipEdge> edges = relationships.stream()
                .distinct()
                .map(this::convertToEdge)
                .toList();

        return new EntityGraph(nodes, edges);
    }

    @Transactional(readOnly = true)
    public List<EntityRelationship> getEntityRelationships(Long entityId) {
        return relationshipRepository.findByEntityId(entityId);
    }

    @Transactional(readOnly = true)
    public List<StoryEntityIndex> findRelatedEntities(Long entityId, int minStrength) {
        List<EntityRelationship> relationships = relationshipRepository
                .findBySourceEntityIdAndStrengthGreaterThanEqual(entityId, minStrength);

        Set<Long> relatedIds = new HashSet<>();
        for (EntityRelationship rel : relationships) {
            relatedIds.add(rel.getTargetEntity().getId());
        }

        return entityIndexRepository.findAllById(relatedIds);
    }

    private EntityNode convertToNode(StoryEntityIndex entity) {
        return new EntityNode(
                entity.getId(),
                entity.getEntityName(),
                entity.getEntityType(),
                entity.getAppearanceCount(),
                entity.getCurrentStatus()
        );
    }

    private RelationshipEdge convertToEdge(EntityRelationship relationship) {
        return new RelationshipEdge(
                relationship.getId(),
                relationship.getSourceEntity().getId(),
                relationship.getTargetEntity().getId(),
                relationship.getRelationshipType(),
                relationship.getStrengthScore(),
                relationship.getRelationshipDescription()
        );
    }

    private String getTextOrDefault(JsonNode node, String fieldName, String defaultValue) {
        JsonNode field = node.get(fieldName);
        if (field != null && !field.isNull() && field.isTextual()) {
            return field.asText();
        }
        return defaultValue;
    }

    private Integer getIntOrDefault(JsonNode node, String fieldName, Integer defaultValue) {
        JsonNode field = node.get(fieldName);
        if (field != null && !field.isNull() && field.isNumber()) {
            return field.asInt();
        }
        return defaultValue;
    }

    public record EntityNode(
            Long id,
            String name,
            String type,
            Integer appearanceCount,
            String currentStatus) {
    }

    public record RelationshipEdge(
            Long id,
            Long sourceId,
            Long targetId,
            String type,
            Integer strength,
            String description) {
    }

    public record EntityGraph(
            List<EntityNode> nodes,
            List<RelationshipEdge> edges) {
    }
}
