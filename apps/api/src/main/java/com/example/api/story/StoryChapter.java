package com.example.api.story;

import com.example.api.common.BaseEntity;
import com.example.api.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 小说章节：支持树形分支结构，任意章节都可以作为分叉点
 */
@Entity
@Table(
        name = "story_chapters",
        indexes = {
                @Index(name = "idx_story_chapters_story_id", columnList = "story_id"),
                @Index(name = "idx_story_chapters_story_sort", columnList = "story_id, sort_order"),
                @Index(name = "idx_story_chapters_author_id", columnList = "author_id"),
                @Index(name = "idx_story_chapters_parent_id", columnList = "parent_chapter_id"),
                @Index(name = "idx_story_chapters_mainline", columnList = "story_id, is_mainline")
        })
public class StoryChapter extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    /** 章节作者（可能是原作者，也可能是 Fork 后的贡献者） */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    /** 父章节（null表示该故事线的起点） */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_chapter_id")
    private StoryChapter parentChapter;

    /** 章节序号（在该故事线内的序号） */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "content_markdown", columnDefinition = "LONGTEXT")
    private String contentMarkdown;

    /** 是否主创的主线（特殊标记） */
    @Column(name = "is_mainline")
    private Boolean isMainline = false;

    /** 分支名称（如：张三的暗黑结局） */
    @Column(name = "branch_name", length = 200)
    private String branchName;

    /** 是否已发布 */
    @Column(name = "published", nullable = false)
    private Boolean published = false;

    protected StoryChapter() {
    }

    public StoryChapter(Story story, int sortOrder, String title, String contentMarkdown) {
        this.story = story;
        this.sortOrder = sortOrder;
        this.title = title != null ? title : ("第" + sortOrder + "章");
        this.contentMarkdown = contentMarkdown != null ? contentMarkdown : "";
    }

    public StoryChapter(Story story, User author, int sortOrder, String title, String contentMarkdown) {
        this.story = story;
        this.author = author;
        this.sortOrder = sortOrder;
        this.title = title != null ? title : ("第" + sortOrder + "章");
        this.contentMarkdown = contentMarkdown != null ? contentMarkdown : "";
    }

    /**
     * 创建分支章节
     */
    public static StoryChapter createBranch(Story story, StoryChapter parentChapter, User author,
                                            int sortOrder, String title, String contentMarkdown) {
        StoryChapter chapter = new StoryChapter();
        chapter.story = story;
        chapter.parentChapter = parentChapter;
        chapter.author = author;
        chapter.sortOrder = sortOrder;
        chapter.title = title != null ? title : ("第" + sortOrder + "章");
        chapter.contentMarkdown = contentMarkdown != null ? contentMarkdown : "";
        chapter.isMainline = false;
        return chapter;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public User getAuthor() {
        return author;
    }

    public void setAuthor(User author) {
        this.author = author;
    }

    public StoryChapter getParentChapter() {
        return parentChapter;
    }

    public void setParentChapter(StoryChapter parentChapter) {
        this.parentChapter = parentChapter;
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

    public Boolean getIsMainline() {
        return isMainline;
    }

    public void setIsMainline(Boolean isMainline) {
        this.isMainline = isMainline;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public Boolean getPublished() {
        return published;
    }

    public void setPublished(Boolean published) {
        this.published = published;
    }

    /**
     * 获取章节字数
     */
    public int getWordCount() {
        if (contentMarkdown == null) return 0;
        String plainText = contentMarkdown
                .replaceAll("[#*_`\\[\\](){}|>-]", "")
                .replaceAll("\\s+", "")
                .trim();
        return plainText.length();
    }

    /**
     * 获取完整路径（从根节点到当前节点）
     */
    public String getFullPath() {
        if (parentChapter == null) {
            return title;
        }
        return parentChapter.getFullPath() + " > " + title;
    }
}
