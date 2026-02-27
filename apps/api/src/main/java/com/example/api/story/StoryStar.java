package com.example.api.story;

import com.example.api.common.BaseEntity;
import com.example.api.user.User;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * 小说Star实体 - 用户收藏/点赞小说
 */
@Entity
@Table(
        name = "story_stars",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_story_user", columnNames = {"story_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_story_stars_story_id", columnList = "story_id"),
                @Index(name = "idx_story_stars_user_id", columnList = "user_id")
        })
public class StoryStar extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    protected StoryStar() {
    }

    public StoryStar(Story story, User user) {
        this.story = story;
        this.user = user;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
