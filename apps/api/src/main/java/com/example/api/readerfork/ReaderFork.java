package com.example.api.readerfork;

import com.example.api.common.BaseEntity;
import com.example.api.story.Story;
import com.example.api.storyseed.StorySeed;
import com.example.api.user.User;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "reader_forks",
        indexes = {
                @Index(name = "idx_reader_forks_story_seed_id", columnList = "story_seed_id"),
                @Index(name = "idx_reader_forks_story_id", columnList = "story_id"),
                @Index(name = "idx_reader_forks_reader_id", columnList = "reader_id"),
                @Index(name = "idx_reader_forks_story_reader", columnList = "story_id,reader_id", unique = true)
        })
public class ReaderFork extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_seed_id")
    private StorySeed storySeed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id")
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reader_id", nullable = false)
    private User reader;

    @jakarta.persistence.Column(length = 200)
    private String title;

    /** 从第几章开始续写（作者章节序号），null 表示从开头 */
    @jakarta.persistence.Column(name = "from_chapter_sort_order")
    private Integer fromChapterSortOrder;

    /** 最后阅读的章节ID */
    @jakarta.persistence.Column(name = "last_read_commit_id")
    private Long lastReadCommitId;

    protected ReaderFork() {
    }

    public ReaderFork(StorySeed storySeed, User reader) {
        this.storySeed = storySeed;
        this.reader = reader;
    }

    public ReaderFork(Story story, User reader) {
        this.story = story;
        this.reader = reader;
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

    public User getReader() {
        return reader;
    }

    public void setReader(User reader) {
        this.reader = reader;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Integer getFromChapterSortOrder() {
        return fromChapterSortOrder;
    }

    public void setFromChapterSortOrder(Integer fromChapterSortOrder) {
        this.fromChapterSortOrder = fromChapterSortOrder;
    }

    public Long getLastReadCommitId() {
        return lastReadCommitId;
    }

    public void setLastReadCommitId(Long lastReadCommitId) {
        this.lastReadCommitId = lastReadCommitId;
    }
}
