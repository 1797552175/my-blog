package com.example.api.rag;

import com.example.api.common.BaseEntity;
import com.example.api.readerfork.StoryCommit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "entity_appearances",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_entity_commit", columnNames = {"entity_id", "commit_id"})
        },
        indexes = {
                @Index(name = "idx_appearance_entity_id", columnList = "entity_id"),
                @Index(name = "idx_appearance_commit_id", columnList = "commit_id"),
                @Index(name = "idx_appearance_significance", columnList = "significance_score")
        })
public class EntityAppearance extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "entity_id", nullable = false)
    private StoryEntityIndex entity;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commit_id", nullable = false)
    private StoryCommit commit;

    @Column(length = 50)
    private String appearanceType;

    @Column(columnDefinition = "TEXT")
    private String contextSnippet;

    private Integer contextStartPosition;

    @Column(length = 100)
    private String emotionalState;

    @Column(length = 100)
    private String physicalState;

    @Column(length = 100)
    private String locationAt;

    private Integer significanceScore;

    private Boolean isKeyMoment;

    protected EntityAppearance() {
    }

    public EntityAppearance(StoryEntityIndex entity, StoryCommit commit) {
        this.entity = entity;
        this.commit = commit;
        this.significanceScore = 5;
        this.isKeyMoment = false;
    }

    public StoryEntityIndex getEntity() {
        return entity;
    }

    public void setEntity(StoryEntityIndex entity) {
        this.entity = entity;
    }

    public StoryCommit getCommit() {
        return commit;
    }

    public void setCommit(StoryCommit commit) {
        this.commit = commit;
    }

    public String getAppearanceType() {
        return appearanceType;
    }

    public void setAppearanceType(String appearanceType) {
        this.appearanceType = appearanceType;
    }

    public String getContextSnippet() {
        return contextSnippet;
    }

    public void setContextSnippet(String contextSnippet) {
        this.contextSnippet = contextSnippet;
    }

    public Integer getContextStartPosition() {
        return contextStartPosition;
    }

    public void setContextStartPosition(Integer contextStartPosition) {
        this.contextStartPosition = contextStartPosition;
    }

    public String getEmotionalState() {
        return emotionalState;
    }

    public void setEmotionalState(String emotionalState) {
        this.emotionalState = emotionalState;
    }

    public String getPhysicalState() {
        return physicalState;
    }

    public void setPhysicalState(String physicalState) {
        this.physicalState = physicalState;
    }

    public String getLocationAt() {
        return locationAt;
    }

    public void setLocationAt(String locationAt) {
        this.locationAt = locationAt;
    }

    public Integer getSignificanceScore() {
        return significanceScore;
    }

    public void setSignificanceScore(Integer significanceScore) {
        this.significanceScore = significanceScore;
    }

    public Boolean getIsKeyMoment() {
        return isKeyMoment;
    }

    public void setIsKeyMoment(Boolean isKeyMoment) {
        this.isKeyMoment = isKeyMoment;
    }
}
