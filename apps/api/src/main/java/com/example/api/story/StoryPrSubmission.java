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

import java.time.Instant;

@Entity
@Table(
        name = "story_pr_submissions",
        indexes = {
                @Index(name = "idx_pr_submissions_story_id", columnList = "story_id"),
                @Index(name = "idx_pr_submissions_submitter_id", columnList = "submitter_id"),
                @Index(name = "idx_pr_submissions_status", columnList = "status"),
                @Index(name = "idx_pr_submissions_novel_id", columnList = "pr_novel_id")
        })
public class StoryPrSubmission extends BaseEntity {

    public static final String STATUS_PENDING = "pending";
    public static final String STATUS_APPROVED = "approved";
    public static final String STATUS_REJECTED = "rejected";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pr_novel_id", nullable = false)
    private StoryPrNovel prNovel;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitter_id", nullable = false)
    private User submitter;

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    private String status = STATUS_PENDING;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(columnDefinition = "TEXT", name = "review_comment")
    private String reviewComment;

    protected StoryPrSubmission() {
    }

    public StoryPrSubmission(StoryPrNovel prNovel, Story story, User submitter, String title, String description) {
        this.prNovel = prNovel;
        this.story = story;
        this.submitter = submitter;
        this.title = title;
        this.description = description;
        this.submittedAt = Instant.now();
    }

    public StoryPrNovel getPrNovel() {
        return prNovel;
    }

    public void setPrNovel(StoryPrNovel prNovel) {
        this.prNovel = prNovel;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public User getSubmitter() {
        return submitter;
    }

    public void setSubmitter(User submitter) {
        this.submitter = submitter;
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

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public User getReviewedBy() {
        return reviewedBy;
    }

    public void setReviewedBy(User reviewedBy) {
        this.reviewedBy = reviewedBy;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(Instant reviewedAt) {
        this.reviewedAt = reviewedAt;
    }

    public String getReviewComment() {
        return reviewComment;
    }

    public void setReviewComment(String reviewComment) {
        this.reviewComment = reviewComment;
    }
}
