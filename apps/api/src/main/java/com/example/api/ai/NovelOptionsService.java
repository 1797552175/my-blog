package com.example.api.ai;

import java.io.IOException;

import com.example.api.ai.dto.NovelOptionsRequest;
import com.example.api.ai.dto.NovelOptionsResponse;

/**
 * 首页：根据用户输入生成小说方案选项（或引导文案）
 */
public interface NovelOptionsService {

    /**
     * 根据用户当前输入和对话历史，返回引导文案和/或 3 个结构化小说方案。
     * 由 AI 自行判断是仅引导还是给出选项；返回格式统一解析。
     */
    NovelOptionsResponse generate(NovelOptionsRequest request);

    /**
     * 流式生成：与 generate 相同的 prompt，通过 callback 流式返回 AI 输出，由前端累积后解析。
     */
    void stream(NovelOptionsRequest request, String model, AiChatService.StreamChatCallback callback) throws IOException;
}
