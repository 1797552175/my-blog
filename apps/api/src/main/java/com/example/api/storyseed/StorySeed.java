package com.example.api.storyseed;

import com.example.api.common.BaseEntity;
import com.example.api.common.JsonConverter;
import com.example.api.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "story_seeds",
        indexes = {
                @Index(name = "idx_story_seeds_slug", columnList = "slug", unique = true),
                @Index(name = "idx_story_seeds_author_id", columnList = "author_id"),
                @Index(name = "idx_story_seeds_published", columnList = "published")
        })
public class StorySeed extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 220, unique = true)
    private String slug;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String openingMarkdown;

    @Column(length = 2000)
    private String styleParams;

    @Column(length = 32)
    private String licenseType;

    @Column(nullable = false)
    private boolean published;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    /**
     * 小说概述/简介
     */
    @Column(name = "story_summary", length = 2000)
    private String storySummary;

    /**
     * 意图分析关键字配置（JSON格式）
     * 示例: {"simple": ["继续", "前进"], "complex": ["法宝", "灵根"]}
     */
    @Column(name = "intent_keywords", columnDefinition = "JSON")
    @Convert(converter = JsonConverter.class)
    private String intentKeywords;

    protected StorySeed() {
    }

    public StorySeed(String title, String slug, String openingMarkdown, boolean published, User author) {
        this.title = title;
        this.slug = slug;
        this.openingMarkdown = openingMarkdown;
        this.published = published;
        this.author = author;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getOpeningMarkdown() {
        return openingMarkdown;
    }

    public void setOpeningMarkdown(String openingMarkdown) {
        this.openingMarkdown = openingMarkdown;
    }

    public String getStyleParams() {
        return styleParams;
    }

    public void setStyleParams(String styleParams) {
        this.styleParams = styleParams;
    }

    public String getLicenseType() {
        return licenseType;
    }

    public void setLicenseType(String licenseType) {
        this.licenseType = licenseType;
    }

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }

    public User getAuthor() {
        return author;
    }

    public void setAuthor(User author) {
        this.author = author;
    }

    public String getStorySummary() {
        return storySummary;
    }

    public void setStorySummary(String storySummary) {
        this.storySummary = storySummary;
    }

    public String getIntentKeywords() {
        return intentKeywords;
    }

    public void setIntentKeywords(String intentKeywords) {
        this.intentKeywords = intentKeywords;
    }
}
