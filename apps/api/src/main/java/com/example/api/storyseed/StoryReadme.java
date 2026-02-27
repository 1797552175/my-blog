package com.example.api.storyseed;

import com.example.api.common.BaseEntity;
import com.example.api.story.Story;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "story_readme",
        indexes = {
                @Index(name = "idx_story_readme_story_seed_id", columnList = "story_seed_id"),
                @Index(name = "idx_story_readme_story_id", columnList = "story_id")
        })
public class StoryReadme extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_seed_id")
    private StorySeed storySeed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id")
    private Story story;

    @Column(columnDefinition = "LONGTEXT")
    private String contentMarkdown;

    protected StoryReadme() {
    }

    public StoryReadme(StorySeed storySeed) {
        this.storySeed = storySeed;
    }

    public StoryReadme(Story story) {
        this.story = story;
    }

    public StorySeed getStorySeed() {
        return storySeed;
    }

    public void setStorySeed(StorySeed storySeed) {
        this.storySeed = storySeed;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public String getContentMarkdown() {
        return contentMarkdown;
    }

    public void setContentMarkdown(String contentMarkdown) {
        this.contentMarkdown = contentMarkdown;
    }
}
