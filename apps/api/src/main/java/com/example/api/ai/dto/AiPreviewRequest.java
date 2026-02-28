package com.example.api.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * AI预览章节保存请求
 */
public class AiPreviewRequest {
    
    @NotNull(message = "章节号不能为空")
    private Integer chapterNumber;
    
    @NotBlank(message = "章节标题不能为空")
    private String title;
    
    @NotBlank(message = "章节内容不能为空")
    private String contentMarkdown;
    
    public AiPreviewRequest() {
    }
    
    public AiPreviewRequest(Integer chapterNumber, String title, String contentMarkdown) {
        this.chapterNumber = chapterNumber;
        this.title = title;
        this.contentMarkdown = contentMarkdown;
    }
    
    public Integer getChapterNumber() {
        return chapterNumber;
    }
    
    public void setChapterNumber(Integer chapterNumber) {
        this.chapterNumber = chapterNumber;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getContentMarkdown() {
        return contentMarkdown;
    }
    
    public void setContentMarkdown(String contentMarkdown) {
        this.contentMarkdown = contentMarkdown;
    }
}
