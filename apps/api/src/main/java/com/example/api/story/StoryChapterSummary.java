package com.example.api.story;

import com.example.api.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/**
 * 作者章节预压缩：发布时 AI 压缩正文后存入，用于前文概要与生成选项。
 */
@Entity
@Table(
        name = "story_chapter_summaries",
        indexes = {
                @Index(name = "uk_chapter_summaries_chapter_id", columnList = "chapter_id", unique = true)
        })
public class StoryChapterSummary extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chapter_id", nullable = false, unique = true)
    private StoryChapter chapter;

    @Column(name = "compressed_content", nullable = false, columnDefinition = "TEXT")
    private String compressedContent;

    @Column(name = "is_fallback", nullable = false)
    private Boolean isFallback = false;

    protected StoryChapterSummary() {
    }

    public StoryChapterSummary(StoryChapter chapter, String compressedContent, boolean isFallback) {
        this.chapter = chapter;
        this.compressedContent = compressedContent != null ? compressedContent : "";
        this.isFallback = isFallback;
    }

    public StoryChapter getChapter() {
        return chapter;
    }

    public void setChapter(StoryChapter chapter) {
        this.chapter = chapter;
    }

    public String getCompressedContent() {
        return compressedContent;
    }

    public void setCompressedContent(String compressedContent) {
        this.compressedContent = compressedContent != null ? compressedContent : "";
    }

    public Boolean getIsFallback() {
        return isFallback;
    }

    public void setIsFallback(Boolean isFallback) {
        this.isFallback = isFallback != null ? isFallback : false;
    }
}
