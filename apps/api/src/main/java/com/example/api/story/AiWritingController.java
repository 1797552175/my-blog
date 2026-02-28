package com.example.api.story;

import com.example.api.story.dto.AiWritingRequest;
import com.example.api.story.dto.AiWritingResponse;
import com.example.api.story.dto.GenerateDirectionOptionsRequest;
import com.example.api.story.dto.GenerateDirectionOptionsResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/api/ai-writing")
public class AiWritingController {

    private final AiWritingService aiWritingService;
    private final DirectionOptionsService directionOptionsService;
    private final ObjectMapper objectMapper;

    public AiWritingController(AiWritingService aiWritingService,
                               DirectionOptionsService directionOptionsService,
                               ObjectMapper objectMapper) {
        this.aiWritingService = aiWritingService;
        this.directionOptionsService = directionOptionsService;
        this.objectMapper = objectMapper;
    }

    /**
     * 生成 3 个故事走向选项（基于预压缩前文，无章节时仅用设定）
     */
    @PostMapping("/generate-direction-options")
    public GenerateDirectionOptionsResponse generateDirectionOptions(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody GenerateDirectionOptionsRequest request) {
        if (userDetails == null) {
            throw new com.example.api.common.ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
        }
        return directionOptionsService.generateOptions(request);
    }

    /**
     * AI辅助写作（非流式）
     */
    @PostMapping
    public AiWritingResponse write(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AiWritingRequest request) {
        if (userDetails == null) {
            throw new com.example.api.common.ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
        }
        return aiWritingService.write(userDetails.getUsername(), request);
    }

    /**
     * AI辅助写作（流式返回）
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public void streamWrite(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody AiWritingRequest request,
            HttpServletResponse response) throws IOException {
        if (userDetails == null) {
            throw new com.example.api.common.ApiException(HttpStatus.UNAUTHORIZED, "请先登录");
        }

        response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        aiWritingService.streamWrite(userDetails.getUsername(), request, new AiWritingService.StreamWriteCallback() {
            @Override
            public void onChunk(String chunk) {
                try {
                    response.getWriter().write("data: " + objectMapper.writeValueAsString(chunk) + "\n\n");
                    response.getWriter().flush();
                } catch (IOException e) {
                    // 客户端断开连接
                }
            }

            @Override
            public void onComplete() {
                try {
                    if (!response.isCommitted()) {
                        response.getWriter().write("data: [DONE]\n\n");
                        response.getWriter().flush();
                        response.getWriter().close();
                    }
                } catch (IOException ignored) {
                }
            }

            @Override
            public void onError(Throwable throwable) {
                try {
                    if (!response.isCommitted()) {
                        response.getWriter().write("data: [ERROR]\n\n");
                        response.getWriter().flush();
                        response.getWriter().close();
                    }
                } catch (IOException ignored) {
                }
            }
        });
    }
}
