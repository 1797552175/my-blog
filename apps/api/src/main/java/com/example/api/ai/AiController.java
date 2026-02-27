package com.example.api.ai;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.ai.dto.ChatMessage;
import com.example.api.ai.dto.ChatRequest;
import com.example.api.ai.dto.ChatResponse;
import com.example.api.ai.dto.PersonaChatRequest;
import com.example.api.ai.dto.PersonaChatResponse;
import com.example.api.ai.dto.GenerateOptionsRequest;
import com.example.api.ai.dto.GenerateOptionsResponse;
import com.example.api.ai.dto.GenerateChapterRequest;
import com.example.api.ai.dto.GenerateChapterResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.api.common.ApiException;
import com.example.api.persona.UserPersonaProfile;
import com.example.api.persona.UserPersonaProfileRepository;
import com.example.api.story.Story;
import com.example.api.story.StoryRepository;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final Logger logger = LoggerFactory.getLogger(AiController.class);
    private static final int POST_SUMMARY_TRUNCATE = 300;
    private static final String SESSION_ID_HEADER = "X-Session-Id";
    
    // 限流相关
    private static final int PERSONA_CHAT_RATE_LIMIT = 10; // 每分钟最多 10 次请求
    private static final long RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分钟
    private final Map<String, long[]> requestCounts = new ConcurrentHashMap<>(); // key -> [最后请求时间, 请求次数]

    @Value("${ai.model:gpt-4o-mini}")
    private String defaultAiModel;

    private final AiChatService aiChatService;
    private final PersonaChatCache personaChatCache;
    private final UserRepository userRepository;
    private final UserPersonaProfileRepository personaProfileRepository;
    private final StoryRepository storyRepository;
    private final ObjectMapper objectMapper;

    public AiController(
            AiChatService aiChatService,
            PersonaChatCache personaChatCache,
            UserRepository userRepository,
            UserPersonaProfileRepository personaProfileRepository,
            StoryRepository storyRepository,
            ObjectMapper objectMapper) {
        this.aiChatService = aiChatService;
        this.personaChatCache = personaChatCache;
        this.userRepository = userRepository;
        this.personaProfileRepository = personaProfileRepository;
        this.storyRepository = storyRepository;
        this.objectMapper = objectMapper;
    }

    /** 获取客户端 IP 地址 */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 如果是多个 IP，取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
    
    /** 检查是否允许请求（限流） */
    private boolean checkRateLimit(String key) {
        long now = System.currentTimeMillis();
        
        requestCounts.compute(key, (k, value) -> {
            if (value == null) {
                // 第一次请求，初始化计数器
                return new long[]{now, 1};
            } else {
                long lastTime = value[0];
                int count = (int) value[1];
                
                if (now - lastTime > RATE_LIMIT_WINDOW_MS) {
                    // 时间窗口已过，重置计数器
                    return new long[]{now, 1};
                } else {
                    // 时间窗口内，增加计数
                    value[1] = count + 1;
                    return value;
                }
            }
        });
        
        long[] value = requestCounts.get(key);
        int count = (int) value[1];
        return count <= PERSONA_CHAT_RATE_LIMIT;
    }

    /** 将 chunk 按 JSON 字符串写入 SSE，避免内容中的换行破坏事件边界。 */
    private void writeSSEChunk(HttpServletResponse response, String chunk) throws JsonProcessingException, IOException {
        response.getWriter().write("data: " + objectMapper.writeValueAsString(chunk) + "\n\n");
        response.getWriter().flush();
    }

    /** 在 response 未提交时写入并关闭，避免与已发送的 body 冲突。 */
    private void safeWriteDoneOrError(HttpServletResponse response, String dataLine) {
        if (response.isCommitted()) return;
        try {
            response.getWriter().write(dataLine + "\n\n");
            response.getWriter().flush();
            response.getWriter().close();
        } catch (IOException ignored) {
        }
    }

    /**
     * 已登录用户 AI 对话（找灵感等）。需 JWT。
     */
    @PostMapping("/chat")
    public ChatResponse chat(@Valid @RequestBody ChatRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
        }
        String systemPrompt = null;
        List<ChatMessage> history = request.messages() != null ? request.messages() : List.of();
        String userContent = request.content() != null ? request.content() : "";
        String content = aiChatService.chat(history, userContent, systemPrompt);
        return new ChatResponse(content);
    }

    /**
     * 已登录用户 AI 对话（流式返回）。需 JWT。
     */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public void streamChat(@Valid @RequestBody ChatRequest request, HttpServletResponse response) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
        }
        String systemPrompt = null;
        List<ChatMessage> history = request.messages() != null ? request.messages() : List.of();
        String userContent = request.content() != null ? request.content() : "";
        String model = defaultAiModel != null && !defaultAiModel.isBlank() ? defaultAiModel : "gpt-4o-mini";

        response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        try {
            aiChatService.streamChat(history, userContent, systemPrompt, model, new AiChatService.StreamChatCallback() {
                @Override
                public void onChunk(String chunk) {
                    try {
                        writeSSEChunk(response, chunk);
                    } catch (IOException e) {
                        // 客户端断开连接，停止发送
                    }
                }

                @Override
                public void onComplete() {
                    safeWriteDoneOrError(response, "data: [DONE]");
                }

                @Override
                public void onError(Throwable throwable) {
                    if (throwable != null) {
                        org.slf4j.LoggerFactory.getLogger(AiController.class).warn("AI stream error: {}", throwable.getMessage(), throwable);
                    }
                    safeWriteDoneOrError(response, "data: [ERROR]");
                }
            });
        } catch (IOException e) {
            // AI 服务未配置或不可用，返回 503
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "AI 服务暂时不可用");
        }
    }

    /**
     * 分身对话（无需 JWT）。从 Header 或 Cookie 取 sessionId，若无则生成并随响应返回。
     */
    @PostMapping("/persona/chat")
    public PersonaChatResponse personaChat(
            @Valid @RequestBody PersonaChatRequest request,
            @RequestHeader(value = SESSION_ID_HEADER, required = false) String sessionIdHeader,
            HttpServletRequest httpRequest) {

        // 限流检查
        String clientIp = getClientIp(httpRequest);
        String rateLimitKey = "persona_chat:" + clientIp;
        if (!checkRateLimit(rateLimitKey)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
        }

        Long authorId = request.authorId();
        if (authorId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请提供作者 ID");
        }

        User author = userRepository.findById(authorId).orElse(null);
        if (author == null || !author.isPersonaEnabled()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "该作者暂未开启 AI 分身");
        }

        String sessionId = sessionIdHeader;
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = httpRequest.getParameter("sessionId");
        }
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        }

        StringBuilder systemBuilder = new StringBuilder();
        UserPersonaProfile profile = personaProfileRepository.findByUserId(authorId).orElse(null);
        if (profile != null && profile.getDistilledContent() != null && !profile.getDistilledContent().isBlank()) {
            systemBuilder.append(profile.getDistilledContent()).append("\n");
        }
        if (author.getPersonaPrompt() != null && !author.getPersonaPrompt().isBlank()) {
            systemBuilder.append(author.getPersonaPrompt()).append("\n");
        }
        if (request.storyId() != null) {
            storyRepository.findById(request.storyId()).ifPresent(story -> {
                if (story.isPublished() && story.getAuthor().getId().equals(authorId)) {
                    systemBuilder.append("当前小说摘要：").append(story.getTitle()).append("\n");
                    String body = story.getStorySummary();
                    if (body != null && body.length() > POST_SUMMARY_TRUNCATE) {
                        body = body.substring(0, POST_SUMMARY_TRUNCATE) + "...";
                    }
                    if (body != null) {
                        systemBuilder.append(body);
                    }
                }
            });
        }
        String systemPrompt = systemBuilder.length() > 0 ? systemBuilder.toString().trim() : "你是该作者的 AI 分身，请以该作者的口吻与读者交流。";

        List<ChatMessage> history = personaChatCache.get(sessionId, authorId);
        String userContent = request.content() != null ? request.content() : "";
        String content = aiChatService.chat(history, userContent, systemPrompt);

        personaChatCache.append(sessionId, authorId, "user", userContent);
        personaChatCache.append(sessionId, authorId, "assistant", content);

        boolean generatedSession = (sessionIdHeader == null || sessionIdHeader.isBlank())
                && (httpRequest.getParameter("sessionId") == null || httpRequest.getParameter("sessionId").isBlank());
        return generatedSession
                ? PersonaChatResponse.of(content, sessionId)
                : PersonaChatResponse.of(content);
    }

    /**
     * 分身对话（流式返回，无需 JWT）。从 Header 或 Cookie 取 sessionId，若无则生成并随响应返回。
     */
    @PostMapping(value = "/persona/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public void streamPersonaChat(
            @Valid @RequestBody PersonaChatRequest request,
            @RequestHeader(value = SESSION_ID_HEADER, required = false) String sessionIdHeader,
            HttpServletRequest httpRequest,
            HttpServletResponse response) throws IOException {

        // 限流检查
        String clientIp = getClientIp(httpRequest);
        String rateLimitKey = "persona_chat_stream:" + clientIp;
        if (!checkRateLimit(rateLimitKey)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "请求过于频繁，请稍后再试");
        }

        Long authorId = request.authorId();
        if (authorId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "请提供作者 ID");
        }

        User author = userRepository.findById(authorId).orElse(null);
        if (author == null || !author.isPersonaEnabled()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "该作者暂未开启 AI 分身");
        }

        String sessionId = sessionIdHeader;
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = httpRequest.getParameter("sessionId");
        }
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = UUID.randomUUID().toString();
        }

        StringBuilder systemBuilder = new StringBuilder();
        UserPersonaProfile profile = personaProfileRepository.findByUserId(authorId).orElse(null);
        if (profile != null && profile.getDistilledContent() != null && !profile.getDistilledContent().isBlank()) {
            systemBuilder.append(profile.getDistilledContent()).append("\n");
        }
        if (author.getPersonaPrompt() != null && !author.getPersonaPrompt().isBlank()) {
            systemBuilder.append(author.getPersonaPrompt()).append("\n");
        }
        if (request.storyId() != null) {
            storyRepository.findById(request.storyId()).ifPresent(story -> {
                if (story.isPublished() && story.getAuthor().getId().equals(authorId)) {
                    systemBuilder.append("当前小说摘要：").append(story.getTitle()).append("\n");
                    String body = story.getStorySummary();
                    if (body != null && body.length() > POST_SUMMARY_TRUNCATE) {
                        body = body.substring(0, POST_SUMMARY_TRUNCATE) + "...";
                    }
                    if (body != null) {
                        systemBuilder.append(body);
                    }
                }
            });
        }
        String systemPrompt = systemBuilder.length() > 0 ? systemBuilder.toString().trim() : "你是该作者的 AI 分身，请以该作者的口吻与读者交流。";

        List<ChatMessage> history = personaChatCache.get(sessionId, authorId);
        final String finalUserContent = request.content() != null ? request.content() : "";
        final String finalSessionId = sessionId;
        final Long finalAuthorId = authorId;
        String model = defaultAiModel != null && !defaultAiModel.isBlank() ? defaultAiModel : "gpt-4o-mini";

        response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        final StringBuilder fullResponse = new StringBuilder();

        aiChatService.streamChat(history, finalUserContent, systemPrompt, model, new AiChatService.StreamChatCallback() {
            @Override
            public void onChunk(String chunk) {
                fullResponse.append(chunk);
                try {
                    writeSSEChunk(response, chunk);
                } catch (IOException e) {
                    // 客户端断开连接，停止发送
                }
            }

            @Override
            public void onComplete() {
                personaChatCache.append(finalSessionId, finalAuthorId, "user", finalUserContent);
                personaChatCache.append(finalSessionId, finalAuthorId, "assistant", fullResponse.toString());
                safeWriteDoneOrError(response, "data: [DONE]");
            }

            @Override
            public void onError(Throwable throwable) {
                if (throwable != null) {
                    org.slf4j.LoggerFactory.getLogger(AiController.class).warn("AI persona stream error: {}", throwable.getMessage(), throwable);
                }
                safeWriteDoneOrError(response, "data: [ERROR]");
            }
        });
    }

    /**
     * 生成故事发展选项
     */
    @PostMapping("/generate-options")
    public GenerateOptionsResponse generateOptions(@Valid @RequestBody GenerateOptionsRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
        }

        String systemPrompt = "你是一个专业的小说创作助手，擅长为小说生成不同的发展方向选项。";
        String userContent = request.getPrompt();

        try {
            String content = aiChatService.chat(List.of(), userContent, systemPrompt);
            
            // 解析AI返回的JSON格式选项（AI返回的是数组）
            List<GenerateOptionsResponse.StoryOption> options = objectMapper.readValue(
                content, 
                new com.fasterxml.jackson.core.type.TypeReference<List<GenerateOptionsResponse.StoryOption>>() {}
            );
            return new GenerateOptionsResponse(options);
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(AiController.class).warn("解析AI选项失败: {}", e.getMessage());
            // 如果解析失败，返回默认选项
            return new GenerateOptionsResponse(List.of(
                new GenerateOptionsResponse.StoryOption(1, "继续冒险", "主角继续探索未知的世界"),
                new GenerateOptionsResponse.StoryOption(2, "寻找线索", "主角开始寻找关键线索"),
                new GenerateOptionsResponse.StoryOption(3, "面对挑战", "主角遇到了新的挑战")
            ));
        }
    }

    /**
     * 生成章节内容
     */
    @PostMapping("/generate-chapter")
    public GenerateChapterResponse generateChapter(@Valid @RequestBody GenerateChapterRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
        }

        String systemPrompt = "你是一个专业的小说创作助手，擅长根据章节内容和选择方向生成连贯的下一章内容。";
        String userContent = request.getPrompt();

        try {
            logger.info("开始生成章节，用户: {}, prompt长度: {}", username, userContent != null ? userContent.length() : 0);
            String content = aiChatService.chat(List.of(), userContent, systemPrompt);
            logger.info("章节生成成功，内容长度: {}", content != null ? content.length() : 0);
            return new GenerateChapterResponse(content);
        } catch (Exception e) {
            logger.error("生成章节失败", e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "生成章节失败: " + e.getMessage());
        }
    }
}
