package com.example.api.story.wiki;

import com.example.api.common.BaseEntity;
import com.example.api.story.Story;
import jakarta.persistence.*;

/**
 * 小说 Wiki 页面（世界观百科、设定资料等）
 */
@Entity
@Table(
        name = "story_wiki_pages",
        indexes = {
                @Index(name = "idx_wiki_pages_story_id", columnList = "story_id"),
                @Index(name = "idx_wiki_pages_category", columnList = "story_id, category"),
                @Index(name = "idx_wiki_pages_sort", columnList = "story_id, sort_order")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_wiki_pages_story_slug", columnNames = {"story_id", "slug"})
        }
)
public class StoryWikiPage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @Column(nullable = false, length = 100)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "content_markdown", columnDefinition = "LONGTEXT")
    private String contentMarkdown;

    @Column(length = 50)
    @Enumerated(EnumType.STRING)
    private WikiCategory category;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    public enum WikiCategory {
        WORLDVIEW("世界观"),
        CHARACTER("角色"),
        TIMELINE("时间线"),
        LOCATION("地点"),
        ITEM("物品/道具"),
        FACTION("势力/组织"),
        OTHER("其他");

        private final String displayName;

        WikiCategory(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    protected StoryWikiPage() {
    }

    public StoryWikiPage(Story story, String slug, String title) {
        this.story = story;
        this.slug = slug;
        this.title = title;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
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

    public WikiCategory getCategory() {
        return category;
    }

    public void setCategory(WikiCategory category) {
        this.category = category;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
