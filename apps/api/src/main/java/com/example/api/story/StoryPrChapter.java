package com.example.api.story;

import com.example.api.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "story_pr_chapters",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_pr_chapters_novel_sort", columnNames = {"pr_novel_id", "sort_order"})
        },
        indexes = {
                @Index(name = "idx_pr_chapters_novel_id", columnList = "pr_novel_id")
        })
public class StoryPrChapter extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pr_novel_id", nullable = false)
    private StoryPrNovel prNovel;

    @Column(nullable = false, name = "sort_order")
    private int sortOrder;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "LONGTEXT", name = "content_markdown")
    private String contentMarkdown;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(name = "word_count")
    private int wordCount;

    protected StoryPrChapter() {
    }

    public StoryPrChapter(StoryPrNovel prNovel, int sortOrder, String title) {
        this.prNovel = prNovel;
        this.sortOrder = sortOrder;
        this.title = title;
    }

    public StoryPrNovel getPrNovel() {
        return prNovel;
    }

    public void setPrNovel(StoryPrNovel prNovel) {
        this.prNovel = prNovel;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
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

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public int getWordCount() {
        return wordCount;
    }

    public void setWordCount(int wordCount) {
        this.wordCount = wordCount;
    }
}
