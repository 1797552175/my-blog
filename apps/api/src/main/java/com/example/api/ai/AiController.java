package com.example.api.ai;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
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
import com.example.api.common.ApiException;
import com.example.api.persona.UserPersonaProfile;
import com.example.api.persona.UserPersonaProfileRepository;
import com.example.api.post.Post;
import com.example.api.post.PostRepository;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final int POST_SUMMARY_TRUNCATE = 300;
    private static final String SESSION_ID_HEADER = "X-Session-Id";

    private final AiChatService aiChatService;
    private final PersonaChatCache personaChatCache;
    private final UserRepository userRepository;
    private final UserPersonaProfileRepository personaProfileRepository;
    private final PostRepository postRepository;

    public AiController(
            AiChatService aiChatService,
            PersonaChatCache personaChatCache,
            UserRepository userRepository,
            UserPersonaProfileRepository personaProfileRepository,
            PostRepository postRepository) {
        this.aiChatService = aiChatService;
        this.personaChatCache = personaChatCache;
        this.userRepository = userRepository;
        this.personaProfileRepository = personaProfileRepository;
        this.postRepository = postRepository;
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
}
