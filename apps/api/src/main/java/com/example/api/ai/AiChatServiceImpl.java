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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.example.api.ai.dto.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Service
public class AiChatServiceImpl implements AiChatService {

    private static final Logger logger = LoggerFactory.getLogger(AiChatServiceImpl.class);

    private final String apiUrl;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    @Value("${ai.debug-log:false}")
    private boolean debugLogEnabled;

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
        logger.info("AI聊天调用: model={}, userContentLength={}", targetModel, 
                userContent != null ? userContent.length() : 0);
        
        if (apiUrl == null || apiUrl.isBlank() || apiKey.isBlank()) {
            logger.warn("AI配置不完整: apiUrl={}, hasApiKey={}", 
                    apiUrl != null && !apiUrl.isBlank(), 
                    apiKey != null && !apiKey.isBlank());
            if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                AiDebugContext.addLog("AI-Model", targetModel);
                AiDebugContext.addLog("AI-UserContentLength", String.valueOf(userContent != null ? userContent.length() : 0));
                AiDebugContext.addLog("AI-ApiUrl", apiUrl != null ? apiUrl.substring(0, Math.min(apiUrl.length(), 50)) + "..." : "null");
                AiDebugContext.addLog("AI-HasApiKey", String.valueOf(apiKey != null && !apiKey.isBlank()));
                AiDebugContext.addLog("AI-Error", "配置不完整");
            }
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

        if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
            AiDebugContext.addLog("AI-Model", targetModel);
            AiDebugContext.addLog("AI-UserContentLength", String.valueOf(userContent != null ? userContent.length() : 0));
            AiDebugContext.addLog("AI-ApiUrl", apiUrl != null ? apiUrl.substring(0, Math.min(apiUrl.length(), 50)) + "..." : "null");
            AiDebugContext.addLog("AI-HasApiKey", String.valueOf(apiKey != null && !apiKey.isBlank()));
            
            // 构建完整的上下文信息
            StringBuilder fullContext = new StringBuilder();
            fullContext.append("=== AI 完整上下文 ===\n");
            fullContext.append("模型: ").append(targetModel).append("\n\n");
            
            if (systemPrompt != null && !systemPrompt.isBlank()) {
                fullContext.append("【System Prompt】\n");
                fullContext.append(systemPrompt).append("\n\n");
            }
            
            if (history != null && !history.isEmpty()) {
                fullContext.append("【History (").append(history.size()).append(" messages)】\n");
                for (ChatMessage m : history) {
                    fullContext.append(m.role()).append(": ").append(m.content()).append("\n");
                }
                fullContext.append("\n");
            }
            
            fullContext.append("【User Content】\n");
            fullContext.append(userContent != null ? userContent : "");
            
            // 将完整上下文分段存储，避免单条日志过长
            String contextStr = fullContext.toString();
            int totalLength = contextStr.length();
            
            // 每段最大长度（约30KB，响应头限制通常是64KB）
            int segmentSize = 30000;
            
            if (totalLength <= segmentSize) {
                // 如果内容较短，直接存储
                AiDebugContext.addLog("AI-FullContext", contextStr);
                AiDebugContext.addLog("AI-FullContext-Length", String.valueOf(totalLength));
            } else {
                // 如果内容较长，分段存储
                int segmentCount = (int) Math.ceil((double) totalLength / segmentSize);
                AiDebugContext.addLog("AI-FullContext-Length", String.valueOf(totalLength));
                AiDebugContext.addLog("AI-FullContext-Segments", String.valueOf(segmentCount));
                
                for (int i = 0; i < segmentCount; i++) {
                    int start = i * segmentSize;
                    int end = Math.min(start + segmentSize, totalLength);
                    String segment = contextStr.substring(start, end);
                    String segmentKey = "AI-FullContext-Part" + (i + 1);
                    AiDebugContext.addLog(segmentKey, segment);
                }
            }
        }

        try {
            long startTime = System.currentTimeMillis();
            URL url = new URL(apiUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + apiKey);
            connection.setDoOutput(true);
            connection.setConnectTimeout(30000); // 30秒连接超时
            connection.setReadTimeout(120000); // 120秒读取超时（生成内容可能需要更长时间）

            connection.getOutputStream().write(body.toString().getBytes(StandardCharsets.UTF_8));

            int responseCode = connection.getResponseCode();
            if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                AiDebugContext.addLog("AI-HttpStatus", String.valueOf(responseCode));
            }

            try (InputStream inputStream = connection.getInputStream();
                 Reader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);
                 BufferedReader bufferedReader = new BufferedReader(reader)) {

                StringBuilder responseBuilder = new StringBuilder();
                String line;
                while ((line = bufferedReader.readLine()) != null) {
                    responseBuilder.append(line);
                }
                String responseBody = responseBuilder.toString();

                long duration = System.currentTimeMillis() - startTime;
                logger.info("AI响应: duration={}ms, responseLength={}", duration, responseBody.length());
                
                if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                    AiDebugContext.addLog("AI-DurationMs", String.valueOf(duration));
                    AiDebugContext.addLog("AI-ResponseLength", String.valueOf(responseBody.length()));
                }

                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode choices = root.get("choices");
                if (choices != null && choices.isArray() && choices.size() > 0) {
                    JsonNode first = choices.get(0);
                    JsonNode message = first != null ? first.get("message") : null;
                    JsonNode content = message != null ? message.get("content") : null;
                    String result = content != null && content.isTextual() ? content.asText() : "";
                    
                    if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                        AiDebugContext.addLog("AI-ResultLength", String.valueOf(result.length()));
                    }
                    
                    return result;
                }
            }
        } catch (Exception e) {
            logger.error("AI服务调用失败", e);
            if (debugLogEnabled && AiDebugContext.hasDebugInfo()) {
                AiDebugContext.addLog("AI-Error", e.getMessage());
            }
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
        connection.setConnectTimeout(30000); // 30秒连接超时
        connection.setReadTimeout(120000); // 120秒读取超时

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
