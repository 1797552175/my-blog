package com.example.api.storyseed;

import com.example.api.common.BaseEntity;
import com.example.api.story.Story;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "story_branch_points",
        indexes = {
                @Index(name = "idx_story_branch_points_story_seed_id", columnList = "story_seed_id"),
                @Index(name = "idx_story_branch_points_story_id", columnList = "story_id")
        })
public class StoryBranchPoint extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_seed_id")
    private StorySeed storySeed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id")
    private Story story;

    @Column(nullable = false)
    private int sortOrder;

    @Column(length = 500)
    private String anchorText;

    @OneToMany(mappedBy = "branchPoint", orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<StoryOption> options = new ArrayList<>();

    protected StoryBranchPoint() {
    }

    public StoryBranchPoint(StorySeed storySeed, int sortOrder) {
        this.storySeed = storySeed;
        this.sortOrder = sortOrder;
    }

    public StoryBranchPoint(Story story, int sortOrder) {
        this.story = story;
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

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getAnchorText() {
        return anchorText;
    }

    public void setAnchorText(String anchorText) {
        this.anchorText = anchorText;
    }

    public List<StoryOption> getOptions() {
        return options;
    }

    public void setOptions(List<StoryOption> options) {
        this.options = options != null ? options : new ArrayList<>();
    }
}
