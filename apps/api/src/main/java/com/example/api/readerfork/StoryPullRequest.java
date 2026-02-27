package com.example.api.readerfork;

import com.example.api.common.BaseEntity;
import com.example.api.storyseed.StorySeed;
import com.example.api.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "story_pull_requests",
        indexes = {
                @Index(name = "idx_story_pr_story_seed_id", columnList = "story_seed_id"),
                @Index(name = "idx_story_pr_status", columnList = "status")
        })
public class StoryPullRequest extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_seed_id", nullable = false)
    private StorySeed storySeed;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fork_id", nullable = false)
    private ReaderFork fork;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_commit_id")
    private StoryCommit fromCommit;

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    protected StoryPullRequest() {
    }

    public StoryPullRequest(StorySeed storySeed, ReaderFork fork, String status) {
        this.storySeed = storySeed;
        this.fork = fork;
        this.status = status;
    }

    public StorySeed getStorySeed() {
        return storySeed;
    }

    public void setStorySeed(StorySeed storySeed) {
        this.storySeed = storySeed;
    }

    public ReaderFork getFork() {
        return fork;
    }

    public void setFork(ReaderFork fork) {
        this.fork = fork;
    }

    public StoryCommit getFromCommit() {
        return fromCommit;
    }

    public void setFromCommit(StoryCommit fromCommit) {
        this.fromCommit = fromCommit;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(User reviewedBy) {
        this.reviewedBy = reviewedBy;
    }
}
