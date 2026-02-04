package com.example.api.ai;

import java.util.List;

import com.example.api.ai.dto.ChatMessage;

/**
 * 非流式调用 OpenAI 兼容的 chat completions 接口，返回 assistant 回复。
 */
public interface AiChatService {

    /**
     * 根据历史消息和本轮用户内容，带上 system prompt，调用大模型并返回助手回复。
     *
     * @param history      已有对话历史（可为空）
     * @param userContent  本轮用户输入
     * @param systemPrompt 系统提示（可为 null）
     * @return 助手回复文本，调用失败时返回空字符串或抛异常
     */
    String chat(List<ChatMessage> history, String userContent, String systemPrompt);
}
