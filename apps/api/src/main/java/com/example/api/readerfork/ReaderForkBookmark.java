package com.example.api.readerfork;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reader_fork_bookmarks", indexes = {
    @Index(name = "idx_fork_id", columnList = "fork_id"),
    @Index(name = "idx_reader_id", columnList = "reader_id")
})
public class ReaderForkBookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "fork_id", nullable = false)
    private Long forkId;

    @Column(name = "reader_id", nullable = false)
    private Long readerId;

    @Column(name = "commit_id")
    private Long commitId;

    @Column(name = "chapter_sort_order")
    private Integer chapterSortOrder;

    @Column(name = "bookmark_name", length = 200)
    private String bookmarkName;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
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
}
