package com.example.api.ai;

import java.io.IOException;
import java.util.List;
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
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.api.common.ApiException;
import com.example.api.persona.UserPersonaProfile;
import com.example.api.persona.UserPersonaProfileRepository;
import com.example.api.post.Post;
import com.example.api.post.PostRepository;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final int POST_SUMMARY_TRUNCATE = 300;
    private static final String SESSION_ID_HEADER = "X-Session-Id";

    @Value("${ai.model:gpt-4o-mini}")
    private String defaultAiModel;

    private final AiChatService aiChatService;
    private final PersonaChatCache personaChatCache;
    private final UserRepository userRepository;
    private final UserPersonaProfileRepository personaProfileRepository;
    private final PostRepository postRepository;
    private final ObjectMapper objectMapper;

    public AiController(
            AiChatService aiChatService,
            PersonaChatCache personaChatCache,
            UserRepository userRepository,
            UserPersonaProfileRepository personaProfileRepository,
            PostRepository postRepository,
            ObjectMapper objectMapper) {
        this.aiChatService = aiChatService;
        this.personaChatCache = personaChatCache;
        this.userRepository = userRepository;
        this.personaProfileRepository = personaProfileRepository;
        this.postRepository = postRepository;
        this.objectMapper = objectMapper;
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
    public void streamChat(@Valid @RequestBody ChatRequest request, HttpServletResponse response) throws IOException {
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
    }

    /**
     * 分身对话（无需 JWT）。从 Header 或 Cookie 取 sessionId，若无则生成并随响应返回。
     */
    @PostMapping("/persona/chat")
    public PersonaChatResponse personaChat(
            @Valid @RequestBody PersonaChatRequest request,
            @RequestHeader(value = SESSION_ID_HEADER, required = false) String sessionIdHeader,
            HttpServletRequest httpRequest) {

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
        if (request.postId() != null) {
            postRepository.findById(request.postId()).ifPresent(post -> {
                if (post.isPublished() && post.getAuthor().getId().equals(authorId)) {
                    systemBuilder.append("当前文章摘要：").append(post.getTitle()).append("\n");
                    String body = post.getContentMarkdown();
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
        if (request.postId() != null) {
            postRepository.findById(request.postId()).ifPresent(post -> {
                if (post.isPublished() && post.getAuthor().getId().equals(authorId)) {
                    systemBuilder.append("当前文章摘要：").append(post.getTitle()).append("\n");
                    String body = post.getContentMarkdown();
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
}
