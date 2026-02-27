package com.example.api.story.wiki;

import com.example.api.common.BaseEntity;
import com.example.api.story.Story;
import jakarta.persistence.*;

/**
 * 小说时间线事件
 */
@Entity
@Table(
        name = "story_wiki_timeline_events",
        indexes = {
                @Index(name = "idx_wiki_timeline_story_id", columnList = "story_id"),
                @Index(name = "idx_wiki_timeline_sort", columnList = "story_id, sort_order")
        }
)
public class StoryWikiTimelineEvent extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @Column(name = "event_time", nullable = false, length = 100)
    private String eventTime;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "content_markdown", columnDefinition = "LONGTEXT")
    private String contentMarkdown;

    @Column(name = "related_characters", length = 500)
    private String relatedCharacters;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    protected StoryWikiTimelineEvent() {
    }

    public StoryWikiTimelineEvent(Story story, String eventTime, String title) {
        this.story = story;
        this.eventTime = eventTime;
        this.title = title;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public String getEventTime() {
        return eventTime;
    }

    public void setEventTime(String eventTime) {
        this.eventTime = eventTime;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getContentMarkdown() {
        return contentMarkdown;
    }

    public void setContentMarkdown(String contentMarkdown) {
        this.contentMarkdown = contentMarkdown;
    }

    public String getRelatedCharacters() {
        return relatedCharacters;
    }

    public void setRelatedCharacters(String relatedCharacters) {
        this.relatedCharacters = relatedCharacters;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
