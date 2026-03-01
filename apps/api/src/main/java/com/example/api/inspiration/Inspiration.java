package com.example.api.inspiration;

import com.example.api.common.BaseEntity;
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
        name = "inspirations",
        indexes = {
                @Index(name = "idx_inspirations_user_id", columnList = "user_id")
        })
public class Inspiration extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = true, length = 200)
    private String title;

    /** 小说方案快照（JSON），用于快速创作预填：title, storySummary, tags, styleId, customStyle, toneId, viewpointId, aiPrompt 等 */
    @Column(name = "option_snapshot", columnDefinition = "JSON")
    private String optionSnapshot;

    protected Inspiration() {
    }

    public Inspiration(User user, String title) {
        this.user = user;
        this.title = title;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getOptionSnapshot() {
        return optionSnapshot;
    }

    public void setOptionSnapshot(String optionSnapshot) {
        this.optionSnapshot = optionSnapshot;
    }
}
