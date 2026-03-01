package com.example.api.story;

import com.example.api.common.BaseEntity;
import com.example.api.readerfork.ReaderFork;
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
        name = "story_pr_novels",
        indexes = {
                @Index(name = "idx_story_pr_novels_story_id", columnList = "story_id"),
                @Index(name = "idx_story_pr_novels_creator_id", columnList = "creator_id"),
                @Index(name = "idx_story_pr_novels_status", columnList = "status"),
                @Index(name = "idx_story_pr_novels_fork_id", columnList = "fork_id")
        })
public class StoryPrNovel extends BaseEntity {

    public static final String STATUS_DRAFT = "draft";
    public static final String STATUS_SUBMITTED = "submitted";
    public static final String STATUS_APPROVED = "approved";
    public static final String STATUS_REJECTED = "rejected";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fork_id", nullable = false)
    private ReaderFork fork;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, name = "from_chapter_sort_order")
    private int fromChapterSortOrder;

    @Column(nullable = false, length = 20)
    private String status = STATUS_DRAFT;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by_id")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(columnDefinition = "TEXT", name = "review_comment")
    private String reviewComment;

    protected StoryPrNovel() {
    }

    public StoryPrNovel(Story story, ReaderFork fork, User creator, String title, int fromChapterSortOrder) {
        this.story = story;
        this.fork = fork;
        this.creator = creator;
        this.title = title;
        this.fromChapterSortOrder = fromChapterSortOrder;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public ReaderFork getFork() {
        return fork;
    }

    public void setFork(ReaderFork fork) {
        this.fork = fork;
    }

    public User getCreator() {
        return creator;
    }

    public void setCreator(User creator) {
        this.creator = creator;
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

    public int getFromChapterSortOrder() {
        return fromChapterSortOrder;
    }

    public void setFromChapterSortOrder(int fromChapterSortOrder) {
        this.fromChapterSortOrder = fromChapterSortOrder;
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
