package com.example.api.ai;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import com.example.api.ai.dto.ChatMessage;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * 分身对话历史缓存，key: persona:{sessionId}:{authorId}，TTL 1 小时。
 */
@Component
public class PersonaChatCache {

    private static final String KEY_PREFIX = "persona:";
    private static final Duration TTL = Duration.ofHours(1);

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    public PersonaChatCache(RedisTemplate<String, String> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    private String key(String sessionId, Long authorId) {
        return KEY_PREFIX + sessionId + ":" + authorId;
    }

    /**
     * 获取该会话下与某作者的对话历史。
     */
    public List<ChatMessage> get(String sessionId, Long authorId) {
        String k = key(sessionId, authorId);
        String raw = redisTemplate.opsForValue().get(k);
        if (raw == null || raw.isBlank()) {
            return new ArrayList<>();
        }
        try {
            List<ChatMessage> list = objectMapper.readValue(raw, new TypeReference<List<ChatMessage>>() {});
            return list != null ? list : new ArrayList<>();
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    /**
     * 追加一条消息并刷新 TTL。
     */
    public void append(String sessionId, Long authorId, String role, String content) {
        List<ChatMessage> list = new ArrayList<>(get(sessionId, authorId));
        list.add(new ChatMessage(role, content != null ? content : ""));
        String k = key(sessionId, authorId);
        try {
            String json = objectMapper.writeValueAsString(list);
            redisTemplate.opsForValue().set(k, json, TTL);
        } catch (Exception ignored) {
        }
    }
}
