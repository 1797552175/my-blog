package com.example.api.story;

import com.example.api.common.BaseEntity;
import com.example.api.common.JsonConverter;
import com.example.api.inspiration.Inspiration;
import com.example.api.storyseed.StoryBranchPoint;
import com.example.api.user.User;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.ArrayList;
import java.util.List;

/**
 * 小说实体 - 统一的小说表
 * 所有小说都按章节存储内容，支持开源协作
 */
@Entity
@Table(
        name = "stories",
        indexes = {
                @Index(name = "idx_stories_slug", columnList = "slug", unique = true),
                @Index(name = "idx_stories_author_id", columnList = "author_id"),
                @Index(name = "idx_stories_published", columnList = "published"),
                @Index(name = "idx_stories_author_published", columnList = "author_id, published"),
                @Index(name = "idx_stories_open_source", columnList = "is_open_source"),
                @Index(name = "idx_stories_license", columnList = "open_source_license")
        })
public class Story extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 220, unique = true)
    private String slug;

    @Column(nullable = false)
    private boolean published;

    // ========== 开源协作相关字段 ==========

    @Column(name = "is_open_source")
    private Boolean openSource = false;

    @Column(name = "open_source_license", length = 50)
    private String openSourceLicense;

    @Column(name = "fork_count")
    private Integer forkCount = 0;

    @Column(name = "star_count")
    private Integer starCount = 0;

    @Version
    private Long version = 0L;

    // ========== AI创作相关字段 ==========

    @Column(name = "style_params", length = 2000)
    private String styleParams;

    @Column(name = "license_type", length = 32)
    private String licenseType;

    /**
     * 小说概述/简介
     */
    @Column(name = "story_summary", length = 2000)
    private String storySummary;

    /**
     * 意图分析关键字配置（JSON格式）
     * 示例: {"simple": ["继续", "前进"], "complex": ["法宝", "灵根"]}
     */
    @Column(name = "intent_keywords", length = 2000)
    private String intentKeywords;

    // ========== 关联字段 ==========

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspiration_id")
    private Inspiration inspiration;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "story_tags", joinColumns = @JoinColumn(name = "story_id"))
    @Column(name = "tag", nullable = false)
    private List<String> tags = new ArrayList<>();

    /**
     * 章节列表 - 级联删除
     */
    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<StoryChapter> chapters = new ArrayList<>();

    /**
     * 分支点列表 - 级联删除
     */
    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<StoryBranchPoint> branchPoints = new ArrayList<>();

    protected Story() {
    }

    // ========== 构造方法 ==========

    public Story(String title, String slug, boolean published, User author) {
        this.title = title;
        this.slug = slug;
        this.published = published;
        this.author = author;
    }

    // ========== 便捷方法 ==========

    /**
     * 是否可以有内容（通过章节数量判断）
     */
    public boolean hasContent() {
        return chapters != null && !chapters.isEmpty();
    }

    /**
     * 是否可以被Fork（开源且已发布）
     */
    public boolean isForkable() {
        return Boolean.TRUE.equals(openSource) && published;
    }

    /**
     * 增加Fork计数
     */
    public void incrementForkCount() {
        this.forkCount++;
    }

    /**
     * 增加Star计数
     */
    public void incrementStarCount() {
        this.starCount++;
    }

    /**
     * 减少Star计数
     */
    public void decrementStarCount() {
        if (this.starCount != null && this.starCount > 0) {
            this.starCount--;
        }
    }

    // ========== Getter / Setter ==========

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

    public boolean isPublished() {
        return published;
    }

    public void setPublished(boolean published) {
        this.published = published;
    }

    public Boolean getOpenSource() {
        return openSource;
    }

    public void setOpenSource(Boolean openSource) {
        this.openSource = openSource;
    }

    public String getOpenSourceLicense() {
        return openSourceLicense;
    }

    public void setOpenSourceLicense(String openSourceLicense) {
        this.openSourceLicense = openSourceLicense;
    }

    public Integer getForkCount() {
        return forkCount;
    }

    public void setForkCount(Integer forkCount) {
        this.forkCount = forkCount;
    }

    public Integer getStarCount() {
        return starCount;
    }

    public void setStarCount(Integer starCount) {
        this.starCount = starCount;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
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

    public User getAuthor() {
        return author;
    }

    public void setAuthor(User author) {
        this.author = author;
    }

    public Inspiration getInspiration() {
        return inspiration;
    }

    public void setInspiration(Inspiration inspiration) {
        this.inspiration = inspiration;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public List<StoryChapter> getChapters() {
        return chapters;
    }

    public void setChapters(List<StoryChapter> chapters) {
        this.chapters = chapters;
    }

    public List<StoryBranchPoint> getBranchPoints() {
        return branchPoints;
    }

    public void setBranchPoints(List<StoryBranchPoint> branchPoints) {
        this.branchPoints = branchPoints;
    }
}
