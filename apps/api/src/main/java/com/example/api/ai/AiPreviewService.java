package com.example.api.ai;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.example.api.ai.dto.AiPreviewResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * AI预览章节缓存服务
 * 使用Redis缓存用户通过AI生成的预览章节
 */
@Service
public class AiPreviewService {

    private static final String KEY_PREFIX = "ai_preview:";
    private static final Duration DEFAULT_TTL = Duration.ofHours(1);

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;
    private final Duration ttl;

    public AiPreviewService(
            RedisTemplate<String, String> redisTemplate,
            ObjectMapper objectMapper,
            @Value("${ai.preview.ttl-hours:1}") int ttlHours) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.ttl = Duration.ofHours(ttlHours);
    }

    /**
     * 构建Redis key
     */
    private String buildKey(String forkId) {
        return KEY_PREFIX + forkId;
    }

    /**
     * 保存AI预览章节
     * 每次生成新章节时追加到列表中
     */
    public void saveAiPreview(String forkId, AiPreviewResponse.AiPreviewChapter chapter) {
        String key = buildKey(forkId);
        try {
            // 获取现有列表
            List<AiPreviewResponse.AiPreviewChapter> chapters = getAiPreviewChapters(forkId);
            if (chapters == null) {
                chapters = new ArrayList<>();
            }
            
            // 检查是否已存在相同章节号的预览，如果存在则替换
            boolean replaced = false;
            for (int i = 0; i < chapters.size(); i++) {
                if (chapters.get(i).getChapterNumber().equals(chapter.getChapterNumber())) {
                    chapters.set(i, chapter);
                    replaced = true;
                    break;
                }
            }
            
            // 如果不存在则添加
            if (!replaced) {
                chapters.add(chapter);
            }
            
            // 保存到Redis
            String json = objectMapper.writeValueAsString(chapters);
            redisTemplate.opsForValue().set(key, json, ttl);
        } catch (Exception e) {
            // 记录日志但不抛出异常，避免影响主流程
            System.err.println("保存AI预览章节失败: " + e.getMessage());
        }
    }

    /**
     * 获取AI预览章节列表
     */
    public List<AiPreviewResponse.AiPreviewChapter> getAiPreviewChapters(String forkId) {
        String key = buildKey(forkId);
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null || json.isBlank()) {
                return new ArrayList<>();
            }
            
            List<AiPreviewResponse.AiPreviewChapter> chapters = objectMapper.readValue(
                json, 
                new TypeReference<List<AiPreviewResponse.AiPreviewChapter>>() {}
            );
            return chapters != null ? chapters : new ArrayList<>();
        } catch (Exception e) {
            System.err.println("获取AI预览章节失败: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 删除AI预览章节
     */
    public void deleteAiPreview(String forkId) {
        String key = buildKey(forkId);
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            System.err.println("删除AI预览章节失败: " + e.getMessage());
        }
    }

    /**
     * 删除指定章节号的AI预览章节
     */
    public boolean deleteAiPreviewChapter(String forkId, Integer chapterNumber) {
        String key = buildKey(forkId);
        try {
            List<AiPreviewResponse.AiPreviewChapter> chapters = getAiPreviewChapters(forkId);
            
            // 查找并删除指定章节
            boolean removed = chapters.removeIf(ch -> ch.getChapterNumber().equals(chapterNumber));
            
            if (!removed) {
                return false;
            }
            
            // 保存更新后的列表
            if (chapters.isEmpty()) {
                redisTemplate.delete(key);
            } else {
                String json = objectMapper.writeValueAsString(chapters);
                redisTemplate.opsForValue().set(key, json, ttl);
            }
            
            return true;
        } catch (Exception e) {
            System.err.println("删除指定AI预览章节失败: " + e.getMessage());
            return false;
        }
    }

    /**
     * 检查是否存在AI预览章节
     */
    public boolean hasAiPreview(String forkId) {
        String key = buildKey(forkId);
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 更新单个AI预览章节
     * 用于异步更新摘要等字段
     */
    public void updateAiPreviewChapter(String forkId, AiPreviewResponse.AiPreviewChapter updatedChapter) {
        String key = buildKey(forkId);
        try {
            List<AiPreviewResponse.AiPreviewChapter> chapters = getAiPreviewChapters(forkId);
            
            // 查找并替换
            boolean found = false;
            for (int i = 0; i < chapters.size(); i++) {
                if (chapters.get(i).getChapterNumber().equals(updatedChapter.getChapterNumber())) {
                    chapters.set(i, updatedChapter);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                System.err.println("更新AI预览章节失败: 未找到章节号 " + updatedChapter.getChapterNumber());
                return;
            }
            
            // 保存到Redis
            String json = objectMapper.writeValueAsString(chapters);
            redisTemplate.opsForValue().set(key, json, ttl);
        } catch (Exception e) {
            System.err.println("更新AI预览章节失败: " + e.getMessage());
        }
    }

    /**
     * 获取AI预览章节列表（包含摘要）
     * 用于构建上下文
     */
    public List<AiPreviewChapterWithSummary> getAiPreviewChaptersWithSummary(String forkId) {
        List<AiPreviewResponse.AiPreviewChapter> chapters = getAiPreviewChapters(forkId);
        return chapters.stream()
                .map(ch -> new AiPreviewChapterWithSummary(
                        ch.getChapterNumber(),
                        ch.getTitle(),
                        ch.getSummary(), // 可能为null，表示摘要尚未生成
                        ch.getCreatedAt()
                ))
                .toList();
    }

    /**
     * 带摘要的AI预览章节信息
     */
    public static class AiPreviewChapterWithSummary {
        private final Integer chapterNumber;
        private final String title;
        private final String summary;
        private final Long createdAt;

        public AiPreviewChapterWithSummary(Integer chapterNumber, String title, String summary, Long createdAt) {
            this.chapterNumber = chapterNumber;
            this.title = title;
            this.summary = summary;
            this.createdAt = createdAt;
        }

        public Integer getChapterNumber() { return chapterNumber; }
        public String getTitle() { return title; }
        public String getSummary() { return summary; }
        public Long getCreatedAt() { return createdAt; }
    }
}
