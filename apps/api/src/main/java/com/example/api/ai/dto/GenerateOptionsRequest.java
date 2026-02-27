package com.example.api.ai.dto;

import jakarta.validation.constraints.NotBlank;

public class GenerateOptionsRequest {
    @NotBlank(message = "提示词不能为空")
    private String prompt;

    public GenerateOptionsRequest() {
    }

    public GenerateOptionsRequest(String prompt) {
        this.prompt = prompt;
    }

    public String getPrompt() {
        return prompt;
    }

    public void setPrompt(String prompt) {
        this.prompt = prompt;
    }
}
