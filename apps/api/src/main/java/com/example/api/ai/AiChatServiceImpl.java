package com.example.api.ai;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.api.ai.dto.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class AiChatServiceImpl implements AiChatService {

    private final String apiUrl;
    private final String apiKey;
    private final String model;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiChatServiceImpl(
            @Value("${ai.api-url:}") String apiUrl,
            @Value("${ai.api-key:}") String apiKey,
            @Value("${ai.model:gpt-4o-mini}") String model,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey == null ? "" : apiKey;
        this.model = model;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public String chat(List<ChatMessage> history, String userContent, String systemPrompt) {
        if (apiUrl == null || apiUrl.isBlank() || apiKey.isBlank()) {
            return "";
        }

        List<Map<String, String>> messages = new ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        if (history != null) {
            for (ChatMessage m : history) {
                messages.add(Map.of("role", m.role(), "content", m.content() != null ? m.content() : ""));
            }
        }
        messages.add(Map.of("role", "user", "content", userContent != null ? userContent : ""));

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        body.set("messages", objectMapper.valueToTree(messages));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<String> entity = new HttpEntity<>(body.toString(), headers);
        String responseBody = restTemplate.postForObject(apiUrl, entity, String.class);
        if (responseBody == null || responseBody.isBlank()) {
            return "";
        }

        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode choices = root.get("choices");
            if (choices != null && choices.isArray() && choices.size() > 0) {
                JsonNode first = choices.get(0);
                JsonNode message = first != null ? first.get("message") : null;
                JsonNode content = message != null ? message.get("content") : null;
                return content != null && content.isTextual() ? content.asText() : "";
            }
        } catch (Exception e) {
            // 解析失败时返回空，避免打断调用方
        }
        return "";
    }
}
