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
        name = "story_characters",
        indexes = {
                @Index(name = "idx_story_characters_story_seed_id", columnList = "story_seed_id"),
                @Index(name = "idx_story_characters_story_id", columnList = "story_id")
        })
public class StoryCharacter extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_seed_id")
    private StorySeed storySeed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id")
    private Story story;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private int sortOrder;

    protected StoryCharacter() {
    }

    public StoryCharacter(StorySeed storySeed, String name, int sortOrder) {
        this.storySeed = storySeed;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public StoryCharacter(Story story, String name, int sortOrder) {
        this.story = story;
        this.name = name;
        this.sortOrder = sortOrder;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
