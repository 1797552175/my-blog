package com.example.api.ai;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.example.api.ai.dto.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class AiChatServiceImpl implements AiChatService {

    private final String apiUrl;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public AiChatServiceImpl(
            @Value("${ai.api-url:}") String apiUrl,
            @Value("${ai.api-key:}") String apiKey,
            @Value("${ai.model:gpt-4o-mini}") String model,
            ObjectMapper objectMapper) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey == null ? "" : apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
    }

    @Override
    public String chat(List<ChatMessage> history, String userContent, String systemPrompt) {
        return chatWithModel(history, userContent, systemPrompt, model);
    }

    private String chatWithModel(List<ChatMessage> history, String userContent, String systemPrompt, String targetModel) {
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
        body.put("model", targetModel);
        body.set("messages", objectMapper.valueToTree(messages));

        try {
            URL url = new URL(apiUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + apiKey);
            connection.setDoOutput(true);
            connection.setConnectTimeout(30000); // 30秒连接超时
            connection.setReadTimeout(60000); // 60秒读取超时

            connection.getOutputStream().write(body.toString().getBytes(StandardCharsets.UTF_8));

            try (InputStream inputStream = connection.getInputStream();
                 Reader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);
                 BufferedReader bufferedReader = new BufferedReader(reader)) {

                StringBuilder responseBuilder = new StringBuilder();
                String line;
                while ((line = bufferedReader.readLine()) != null) {
                    responseBuilder.append(line);
                }
                String responseBody = responseBuilder.toString();

                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode choices = root.get("choices");
                if (choices != null && choices.isArray() && choices.size() > 0) {
                    JsonNode first = choices.get(0);
                    JsonNode message = first != null ? first.get("message") : null;
                    JsonNode content = message != null ? message.get("content") : null;
                    return content != null && content.isTextual() ? content.asText() : "";
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("AI服务调用失败: " + e.getMessage(), e);
        }
        throw new RuntimeException("AI服务返回无效响应");
    }

    @Override
    public void streamChat(List<ChatMessage> history, String userContent, String systemPrompt, String targetModel, StreamChatCallback callback) throws IOException {
        if (apiUrl == null || apiUrl.isBlank() || apiKey.isBlank()) {
            throw new IOException("AI 服务未配置");
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
        body.put("model", targetModel != null && !targetModel.isBlank() ? targetModel : model);
        body.set("messages", objectMapper.valueToTree(messages));
        body.put("stream", true);

        URL url = new URL(apiUrl);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Authorization", "Bearer " + apiKey);
        connection.setDoOutput(true);
        connection.setReadTimeout(60000); // 60秒超时

        connection.getOutputStream().write(body.toString().getBytes(StandardCharsets.UTF_8));

        try (InputStream inputStream = connection.getInputStream();
             Reader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);
             BufferedReader bufferedReader = new BufferedReader(reader)) {

            String line;
            while ((line = bufferedReader.readLine()) != null) {
                if (line.isBlank()) continue;
                if (line.equals("data: [DONE]")) break;
                if (line.startsWith("data: ")) {
                    String jsonStr = line.substring(6);
                    try {
                        JsonNode root = objectMapper.readTree(jsonStr);
                        JsonNode choices = root.get("choices");
                        if (choices != null && choices.isArray() && choices.size() > 0) {
                            JsonNode first = choices.get(0);
                            JsonNode delta = first != null ? first.get("delta") : null;
                            JsonNode content = delta != null ? delta.get("content") : null;
                            if (content != null && content.isTextual()) {
                                callback.onChunk(content.asText());
                            }
                        }
                    } catch (Exception e) {
                        // 解析失败时继续，避免打断流
                    }
                }
            }
            callback.onComplete();
        } catch (Exception e) {
            callback.onError(e);
        } finally {
            connection.disconnect();
        }
    }
}
