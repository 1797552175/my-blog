package com.example.api.ai.dto;

public class GenerateChapterResponse {
    private String content;

    public GenerateChapterResponse() {
    }

    public GenerateChapterResponse(String content) {
        this.content = content;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
