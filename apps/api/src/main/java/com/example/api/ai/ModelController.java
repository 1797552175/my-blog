package com.example.api.ai;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.auth.AuthController;
import com.example.api.user.User;
import com.example.api.user.UserRepository;

import java.util.List;

/**
 * 模型管理控制器，用于获取可用的AI模型列表。
 */
@RestController
@RequestMapping("/api/ai/models")
public class ModelController {

    private final UserRepository userRepository;

    public ModelController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * 获取可用的AI模型列表（根据用户权限）。
     */
    @GetMapping
    public List<ModelResponse> getModels() {
        User user = AuthController.currentUser();
        // 这里可以根据用户权限返回不同的模型列表
        // 目前返回所有可用模型
        return List.of(
                new ModelResponse("gpt-4o-mini", "GPT-4o-mini", "OpenAI", "最经济实惠的模型，适合大多数任务"),
                new ModelResponse("gpt-4o", "GPT-4o", "OpenAI", "功能强大的最新模型，适合复杂任务"),
                new ModelResponse("gpt-4-turbo", "GPT-4 Turbo", "OpenAI", "平衡性能和成本的模型"),
                new ModelResponse("gpt-3.5-turbo", "GPT-3.5 Turbo", "OpenAI", "快速响应的基础模型")
        );
    }

    /**
     * 模型响应DTO。
     */
    public record ModelResponse(String id, String name, String provider, String description) {
    }
}
