package com.example.api.ai;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.example.api.ai.dto.ChatMessage;
import com.example.api.ai.dto.NovelOptionItem;
import com.example.api.ai.dto.NovelOptionsRequest;
import com.example.api.ai.dto.NovelOptionsResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class NovelOptionsServiceImpl implements NovelOptionsService {

    private static final Logger logger = LoggerFactory.getLogger(NovelOptionsServiceImpl.class);
    private static final Pattern JSON_BLOCK = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```", Pattern.CASE_INSENSITIVE);

    private final AiChatService aiChatService;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
你是一个帮助用户构思小说的助手。用户会在首页输入「创作想法」，你需要根据情况回复。

【情况一】当用户只是打招呼、或说没想好写什么、或输入与写小说无关时：
只输出纯文本引导，不要任何 JSON 或大括号。例如直接输出：
可以说说你想写什么类型（玄幻、都市、悬疑…），或主角身份、核心冲突，我来帮你出几个开篇方案。

【情况二】当用户已经给出了与写小说相关的想法时，必须严格按以下格式输出（便于前端逐条解析）：
1) 先输出恰好 3 行，每行是且仅是一个完整的 JSON 对象，表示一个小说方案。一行内不要换行。每行格式示例：
{"title":"书名","storySummary":"简介","tags":["标签1"],"styleId":"xuanhuan","customStyle":"","toneId":"steady","viewpointId":"third","aiPrompt":""}
2) 第 4 行输出一个空行（换行）。
3) 从第 5 行开始输出引导文案纯文本，例如：以下是 3 个方案，选一个保存到灵感或快速创作。

字段说明（仅用于情况二的每行 JSON）：
- title: 小说书名，必填
- storySummary: 小说简介，必填
- tags: 字符串数组，最多5个，可空数组
- styleId: 只能是以下之一或空字符串：xuanhuan, wuxia, scifi, fantasy, romance, suspense, history, modern
- customStyle: 自定义风格补充，可空
- toneId: light, steady, intense, dark 之一，默认 steady
- viewpointId: first 或 third，默认 third
- aiPrompt: 给 AI 写作的额外提示，可空
""";

    public NovelOptionsServiceImpl(AiChatService aiChatService, ObjectMapper objectMapper) {
        this.aiChatService = aiChatService;
        this.objectMapper = objectMapper;
    }

    @Override
    public NovelOptionsResponse generate(NovelOptionsRequest request) {
        List<ChatMessage> history = request.history() != null ? request.history() : List.of();
        String message = request.message() != null ? request.message().trim() : "";
        if (message.isEmpty()) {
            return new NovelOptionsResponse("请输入你的创作想法，或说说你想写什么类型的小说。", Collections.emptyList());
        }

        String raw = aiChatService.chat(history, message, SYSTEM_PROMPT);
        if (raw == null || raw.isBlank()) {
            return new NovelOptionsResponse("AI 暂时无法回复，请稍后再试。", Collections.emptyList());
        }

        String jsonStr = extractJson(raw);
        if (jsonStr == null) {
            return new NovelOptionsResponse(raw, Collections.emptyList());
        }

        try {
            JsonNode root = objectMapper.readTree(jsonStr);
            String guidanceText = root.has("guidanceText") && root.get("guidanceText").isTextual()
                    ? root.get("guidanceText").asText()
                    : "";
            List<NovelOptionItem> options = new ArrayList<>();
            if (root.has("options") && root.get("options").isArray()) {
                for (JsonNode opt : root.get("options")) {
                    options.add(parseOption(opt));
                }
            }
            return new NovelOptionsResponse(guidanceText, options);
        } catch (Exception e) {
            logger.warn("Parse novel options JSON failed, fallback to raw text: {}", e.getMessage());
            return new NovelOptionsResponse(raw, Collections.emptyList());
        }
    }

    @Override
    public void stream(NovelOptionsRequest request, String model, AiChatService.StreamChatCallback callback) throws IOException {
        List<ChatMessage> history = request.history() != null ? request.history() : List.of();
        String message = request.message() != null ? request.message().trim() : "";
        if (message.isEmpty()) {
            callback.onChunk("请输入你的创作想法，或说说你想写什么类型的小说。");
            callback.onComplete();
            return;
        }
        String targetModel = model != null && !model.isBlank() ? model : "gpt-4o-mini";
        aiChatService.streamChat(history, message, SYSTEM_PROMPT, targetModel, callback);
    }

    private String extractJson(String raw) {
        raw = raw.trim();
        Matcher m = JSON_BLOCK.matcher(raw);
        if (m.find()) {
            return m.group(1).trim();
        }
        if (raw.startsWith("{")) {
            return raw;
        }
        return null;
    }

    private NovelOptionItem parseOption(JsonNode n) {
        String title = n.has("title") ? n.get("title").asText("") : "";
        String storySummary = n.has("storySummary") ? n.get("storySummary").asText("") : "";
        List<String> tags = new ArrayList<>();
        if (n.has("tags") && n.get("tags").isArray()) {
            for (JsonNode t : n.get("tags")) {
                if (t.isTextual()) tags.add(t.asText());
            }
        }
        String styleId = n.has("styleId") ? n.get("styleId").asText("") : "";
        String customStyle = n.has("customStyle") ? n.get("customStyle").asText("") : "";
        String toneId = n.has("toneId") ? n.get("toneId").asText("steady") : "steady";
        String viewpointId = n.has("viewpointId") ? n.get("viewpointId").asText("third") : "third";
        String aiPrompt = n.has("aiPrompt") ? n.get("aiPrompt").asText("") : "";
        return new NovelOptionItem(title, storySummary, tags, styleId, customStyle, toneId, viewpointId, aiPrompt);
    }
}
