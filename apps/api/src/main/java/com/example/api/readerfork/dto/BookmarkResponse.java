package com.example.api.readerfork.dto;

import java.time.Instant;

public class BookmarkResponse {
    private Long id;
    private Instant createdAt;
    private Instant updatedAt;
    private Long forkId;
    private Long readerId;
    private Long commitId;
    private Integer chapterSortOrder;
    private String bookmarkName;
    private String notes;
    private Integer sortOrder;
    private String commitTitle;
    private String commitSummary;

    public BookmarkResponse() {
    }

    public BookmarkResponse(Long id, Instant createdAt, Instant updatedAt, Long forkId, Long readerId,
                           Long commitId, Integer chapterSortOrder, String bookmarkName, String notes,
                           Integer sortOrder, String commitTitle, String commitSummary) {
        this.id = id;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.forkId = forkId;
        this.readerId = readerId;
        this.commitId = commitId;
        this.chapterSortOrder = chapterSortOrder;
        this.bookmarkName = bookmarkName;
        this.notes = notes;
        this.sortOrder = sortOrder;
        this.commitTitle = commitTitle;
        this.commitSummary = commitSummary;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getForkId() {
        return forkId;
    }

    public void setForkId(Long forkId) {
        this.forkId = forkId;
    }

    public Long getReaderId() {
        return readerId;
    }

    public void setReaderId(Long readerId) {
        this.readerId = readerId;
    }

    public Long getCommitId() {
        return commitId;
    }

    public void setCommitId(Long commitId) {
        this.commitId = commitId;
    }

    public Integer getChapterSortOrder() {
        return chapterSortOrder;
    }

    public void setChapterSortOrder(Integer chapterSortOrder) {
        this.chapterSortOrder = chapterSortOrder;
    }

    public String getBookmarkName() {
        return bookmarkName;
    }

    public void setBookmarkName(String bookmarkName) {
        this.bookmarkName = bookmarkName;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getCommitTitle() {
        return commitTitle;
    }

    public void setCommitTitle(String commitTitle) {
        this.commitTitle = commitTitle;
    }

    public String getCommitSummary() {
        return commitSummary;
    }

    public void setCommitSummary(String commitSummary) {
        this.commitSummary = commitSummary;
    }
}
