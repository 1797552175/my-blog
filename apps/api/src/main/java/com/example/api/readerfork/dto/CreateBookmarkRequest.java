package com.example.api.readerfork.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class CreateBookmarkRequest {
    @NotNull
    private Long forkId;

    private Long commitId;

    private Integer chapterSortOrder;

    private String bookmarkName;

    private String notes;

    @Min(0)
    @Max(1000)
    private Integer sortOrder;

    public CreateBookmarkRequest() {
    }

    public Long getForkId() {
        return forkId;
    }

    public void setForkId(Long forkId) {
        this.forkId = forkId;
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
}
