package com.example.api.ai.dto;

import java.util.List;

/**
 * AI预览章节响应
 */
public class AiPreviewResponse {
    
    private List<AiPreviewChapter> chapters;
    
    public AiPreviewResponse() {
    }
    
    public AiPreviewResponse(List<AiPreviewChapter> chapters) {
        this.chapters = chapters;
    }
    
    public List<AiPreviewChapter> getChapters() {
        return chapters;
    }
    
    public void setChapters(List<AiPreviewChapter> chapters) {
        this.chapters = chapters;
    }
    
    /**
     * AI预览章节信息
     */
    public static class AiPreviewChapter {
        private Integer chapterNumber;
        private String title;
        private String contentMarkdown;
        private String summary; // 预压缩摘要
        private Long createdAt;
        private Boolean summaryGenerating; // 是否正在生成摘要
        
        public AiPreviewChapter() {
        }
        
        public AiPreviewChapter(Integer chapterNumber, String title, String contentMarkdown, Long createdAt) {
            this.chapterNumber = chapterNumber;
            this.title = title;
            this.contentMarkdown = contentMarkdown;
            this.createdAt = createdAt;
        }
        
        public AiPreviewChapter(Integer chapterNumber, String title, String contentMarkdown, String summary, Long createdAt) {
            this.chapterNumber = chapterNumber;
            this.title = title;
            this.contentMarkdown = contentMarkdown;
            this.summary = summary;
            this.createdAt = createdAt;
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
        
        public Long getCreatedAt() {
            return createdAt;
        }
        
        public void setCreatedAt(Long createdAt) {
            this.createdAt = createdAt;
        }
        
        public String getSummary() {
            return summary;
        }
        
        public void setSummary(String summary) {
            this.summary = summary;
        }
        
        public Boolean getSummaryGenerating() {
            return summaryGenerating;
        }
        
        public void setSummaryGenerating(Boolean summaryGenerating) {
            this.summaryGenerating = summaryGenerating;
        }
    }
}
