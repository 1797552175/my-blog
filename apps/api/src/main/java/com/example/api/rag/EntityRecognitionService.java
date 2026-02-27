package com.example.api.rag;

import com.example.api.ai.AiChatService;
import com.example.api.readerfork.StoryCommit;
import com.example.api.storyseed.StorySeed;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class EntityRecognitionService {

    private static final Logger logger = LoggerFactory.getLogger(EntityRecognitionService.class);

    private final AiChatService aiChatService;
    private final StoryEntityIndexRepository entityIndexRepository;
    private final EntityAppearanceRepository appearanceRepository;
    private final ObjectMapper objectMapper;

    private static final String ENTITY_RECOGNITION_PROMPT = """
            你是一位专业的小说分析助手。请从以下章节内容中提取所有实体（角色、地点、物品、组织）。
            
            要求：
            1. 识别所有角色名称、地点名称、物品名称、组织名称
            2. 分析每个实体的行为和状态
            3. 判断是否是新出现的实体
            4. 提取关键上下文片段
            
            请严格按照以下JSON格式输出：
            {
              "characters": [
                {
                  "name": "角色名",
                  "alias": ["别名1", "别名2"],
                  "actions": "主要行为",
                  "emotional_state": "情绪状态",
                  "is_new": false,
                  "significance": 1-10
                }
              ],
              "locations": [
                {
                  "name": "地点名",
                  "description": "场景描述",
                  "is_new": false
                }
              ],
              "items": [
                {
                  "name": "物品名",
                  "significance": "重要性描述",
                  "is_new": false
                }
              ],
              "organizations": [
                {
                  "name": "组织名",
                  "description": "组织描述",
                  "is_new": false
                }
              ]
            }
            """;

    public EntityRecognitionService(
            AiChatService aiChatService,
            StoryEntityIndexRepository entityIndexRepository,
            EntityAppearanceRepository appearanceRepository,
            ObjectMapper objectMapper) {
        this.aiChatService = aiChatService;
        this.entityIndexRepository = entityIndexRepository;
        this.appearanceRepository = appearanceRepository;
        this.objectMapper = objectMapper;
    }

    @Async
    @Transactional
    public void recognizeAndIndexEntitiesAsync(StoryCommit commit, StorySeed seed) {
        try {
            recognizeAndIndexEntities(commit, seed);
        } catch (Exception e) {
            logger.error("Failed to recognize entities for commit {}", commit.getId(), e);
        }
    }

    @Transactional
    public void recognizeAndIndexEntities(StoryCommit commit, StorySeed seed) {
        String chapterContent = commit.getContentMarkdown();
        if (chapterContent == null || chapterContent.isBlank()) {
            return;
        }

        List<StoryEntityIndex> existingEntities = entityIndexRepository.findByStorySeedId(seed.getId());
        String existingEntitiesJson = buildExistingEntitiesJson(existingEntities);

        String userPrompt = String.format("""
                【已有实体列表】
                %s
                
                【章节内容】
                %s
                """, existingEntitiesJson, chapterContent);

        String jsonResponse = aiChatService.chat(List.of(), userPrompt, ENTITY_RECOGNITION_PROMPT);

        if (jsonResponse == null || jsonResponse.isBlank()) {
            logger.warn("Empty AI response for entity recognition, commit {}", commit.getId());
            return;
        }

        try {
            parseAndSaveEntities(jsonResponse, commit, seed, existingEntities);
            logger.info("Recognized and indexed entities for commit {}", commit.getId());
        } catch (Exception e) {
            logger.error("Failed to parse entity recognition response for commit {}", commit.getId(), e);
        }
    }

    private String buildExistingEntitiesJson(List<StoryEntityIndex> entities) {
        if (entities.isEmpty()) {
            return "无";
        }

        StringBuilder sb = new StringBuilder();
        Map<String, List<StoryEntityIndex>> byType = new HashMap<>();

        for (StoryEntityIndex entity : entities) {
            byType.computeIfAbsent(entity.getEntityType(), k -> new ArrayList<>()).add(entity);
        }

        byType.forEach((type, list) -> {
            sb.append(type).append(": ");
            sb.append(list.stream().map(StoryEntityIndex::getEntityName).reduce((a, b) -> a + ", " + b).orElse(""));
            sb.append("\n");
        });

        return sb.toString();
    }

    private void parseAndSaveEntities(String jsonResponse, StoryCommit commit,
                                      StorySeed seed, List<StoryEntityIndex> existingEntities) throws Exception {
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

        Map<String, StoryEntityIndex> entityMap = new HashMap<>();
        for (StoryEntityIndex e : existingEntities) {
            entityMap.put(e.getEntityName(), e);
        }

        if (root.has("characters")) {
            JsonNode characters = root.get("characters");
            if (characters.isArray()) {
                for (JsonNode charNode : characters) {
                    processCharacterEntity(charNode, commit, seed, entityMap);
                }
            }
        }

        if (root.has("locations")) {
            JsonNode locations = root.get("locations");
            if (locations.isArray()) {
                for (JsonNode locNode : locations) {
                    processLocationEntity(locNode, commit, seed, entityMap);
                }
            }
        }

        if (root.has("items")) {
            JsonNode items = root.get("items");
            if (items.isArray()) {
                for (JsonNode itemNode : items) {
                    processItemEntity(itemNode, commit, seed, entityMap);
                }
            }
        }

        if (root.has("organizations")) {
            JsonNode orgs = root.get("organizations");
            if (orgs.isArray()) {
                for (JsonNode orgNode : orgs) {
                    processOrganizationEntity(orgNode, commit, seed, entityMap);
                }
            }
        }
    }

    private void processCharacterEntity(JsonNode charNode, StoryCommit commit,
                                        StorySeed seed, Map<String, StoryEntityIndex> entityMap) {
        String name = getTextOrDefault(charNode, "name", null);
        if (name == null || name.isBlank()) {
            return;
        }

        StoryEntityIndex entity = entityMap.get(name);
        boolean isNew = false;

        if (entity == null) {
            entity = new StoryEntityIndex(seed, "character", name);
            entity.setFirstAppearanceCommit(commit);
            entity.setAppearanceCount(0);
            isNew = true;
        }

        entity.setLastAppearanceCommit(commit);
        entity.setAppearanceCount(entity.getAppearanceCount() + 1);

        if (charNode.has("emotional_state")) {
            entity.setCurrentStatus(charNode.get("emotional_state").asText());
        }

        entity = entityIndexRepository.save(entity);
        entityMap.put(name, entity);

        createAppearanceRecord(entity, commit, charNode, "character");
    }

    private void processLocationEntity(JsonNode locNode, StoryCommit commit,
                                       StorySeed seed, Map<String, StoryEntityIndex> entityMap) {
        String name = getTextOrDefault(locNode, "name", null);
        if (name == null || name.isBlank()) {
            return;
        }

        StoryEntityIndex entity = entityMap.get(name);

        if (entity == null) {
            entity = new StoryEntityIndex(seed, "location", name);
            entity.setFirstAppearanceCommit(commit);
            entity.setAppearanceCount(0);
        }

        entity.setLastAppearanceCommit(commit);
        entity.setAppearanceCount(entity.getAppearanceCount() + 1);

        if (locNode.has("description")) {
            entity.setDescription(locNode.get("description").asText());
        }

        entity = entityIndexRepository.save(entity);
        entityMap.put(name, entity);

        createAppearanceRecord(entity, commit, locNode, "location");
    }

    private void processItemEntity(JsonNode itemNode, StoryCommit commit,
                                   StorySeed seed, Map<String, StoryEntityIndex> entityMap) {
        String name = getTextOrDefault(itemNode, "name", null);
        if (name == null || name.isBlank()) {
            return;
        }

        StoryEntityIndex entity = entityMap.get(name);

        if (entity == null) {
            entity = new StoryEntityIndex(seed, "item", name);
            entity.setFirstAppearanceCommit(commit);
            entity.setAppearanceCount(0);
        }

        entity.setLastAppearanceCommit(commit);
        entity.setAppearanceCount(entity.getAppearanceCount() + 1);

        if (itemNode.has("significance")) {
            entity.setDescription(itemNode.get("significance").asText());
        }

        entity = entityIndexRepository.save(entity);
        entityMap.put(name, entity);

        createAppearanceRecord(entity, commit, itemNode, "item");
    }

    private void processOrganizationEntity(JsonNode orgNode, StoryCommit commit,
                                           StorySeed seed, Map<String, StoryEntityIndex> entityMap) {
        String name = getTextOrDefault(orgNode, "name", null);
        if (name == null || name.isBlank()) {
            return;
        }

        StoryEntityIndex entity = entityMap.get(name);

        if (entity == null) {
            entity = new StoryEntityIndex(seed, "organization", name);
            entity.setFirstAppearanceCommit(commit);
            entity.setAppearanceCount(0);
        }

        entity.setLastAppearanceCommit(commit);
        entity.setAppearanceCount(entity.getAppearanceCount() + 1);

        if (orgNode.has("description")) {
            entity.setDescription(orgNode.get("description").asText());
        }

        entity = entityIndexRepository.save(entity);
        entityMap.put(name, entity);

        createAppearanceRecord(entity, commit, orgNode, "organization");
    }

    private void createAppearanceRecord(StoryEntityIndex entity, StoryCommit commit,
                                        JsonNode node, String entityType) {
        if (appearanceRepository.existsByEntityIdAndCommitId(entity.getId(), commit.getId())) {
            return;
        }

        EntityAppearance appearance = new EntityAppearance(entity, commit);
        appearance.setAppearanceType(entityType);

        if (node.has("actions")) {
            appearance.setContextSnippet(node.get("actions").asText());
        }

        if (node.has("emotional_state")) {
            appearance.setEmotionalState(node.get("emotional_state").asText());
        }

        if (node.has("significance")) {
            JsonNode sigNode = node.get("significance");
            if (sigNode.isNumber()) {
                appearance.setSignificanceScore(sigNode.asInt());
            }
        }

        appearanceRepository.save(appearance);
    }

    private String getTextOrDefault(JsonNode node, String fieldName, String defaultValue) {
        JsonNode field = node.get(fieldName);
        if (field != null && !field.isNull() && field.isTextual()) {
            return field.asText();
        }
        return defaultValue;
    }

    @Transactional(readOnly = true)
    public List<StoryEntityIndex> getEntitiesByStory(Long storySeedId) {
        return entityIndexRepository.findByStorySeedId(storySeedId);
    }

    @Transactional(readOnly = true)
    public List<StoryEntityIndex> getEntitiesByType(Long storySeedId, String entityType) {
        return entityIndexRepository.findByStorySeedIdAndEntityType(storySeedId, entityType);
    }

    @Transactional(readOnly = true)
    public Optional<StoryEntityIndex> getEntityByName(Long storySeedId, String entityType, String entityName) {
        return entityIndexRepository.findByStorySeedIdAndEntityTypeAndEntityName(storySeedId, entityType, entityName);
    }
}
