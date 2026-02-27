package com.example.api.rag;

import com.example.api.common.BaseEntity;
import com.example.api.readerfork.StoryCommit;
import com.example.api.storyseed.StorySeed;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "story_entity_index",
        indexes = {
                @Index(name = "idx_entity_story_seed_id", columnList = "story_seed_id"),
                @Index(name = "idx_entity_type_name", columnList = "story_seed_id,entity_type,entity_name"),
                @Index(name = "idx_entity_type", columnList = "entity_type"),
                @Index(name = "idx_entity_appearance_count", columnList = "appearance_count")
        })
public class StoryEntityIndex extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_seed_id", nullable = false)
    private StorySeed storySeed;

    @Column(nullable = false, length = 50)
    private String entityType;

    @Column(nullable = false, length = 100)
    private String entityName;

    @Column(columnDefinition = "JSON")
    private String entityAlias;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "first_appearance_commit_id")
    private StoryCommit firstAppearanceCommit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_appearance_commit_id")
    private StoryCommit lastAppearanceCommit;

    private Integer appearanceCount;

    @Column(length = 200)
    private String currentStatus;

    @Column(columnDefinition = "JSON")
    private String statusHistory;

    @Column(columnDefinition = "JSON")
    private String relationships;

    protected StoryEntityIndex() {
    }

    public StoryEntityIndex(StorySeed storySeed, String entityType, String entityName) {
        this.storySeed = storySeed;
        this.entityType = entityType;
        this.entityName = entityName;
        this.appearanceCount = 0;
    }

    public StorySeed getStorySeed() {
        return storySeed;
    }

    public void setStorySeed(StorySeed storySeed) {
        this.storySeed = storySeed;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getEntityName() {
        return entityName;
    }

    public void setEntityName(String entityName) {
        this.entityName = entityName;
    }

    public String getEntityAlias() {
        return entityAlias;
    }

    public void setEntityAlias(String entityAlias) {
        this.entityAlias = entityAlias;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public StoryCommit getFirstAppearanceCommit() {
        return firstAppearanceCommit;
    }

    public void setFirstAppearanceCommit(StoryCommit firstAppearanceCommit) {
        this.firstAppearanceCommit = firstAppearanceCommit;
    }

    public StoryCommit getLastAppearanceCommit() {
        return lastAppearanceCommit;
    }

    public void setLastAppearanceCommit(StoryCommit lastAppearanceCommit) {
        this.lastAppearanceCommit = lastAppearanceCommit;
    }

    public Integer getAppearanceCount() {
        return appearanceCount;
    }

    public void setAppearanceCount(Integer appearanceCount) {
        this.appearanceCount = appearanceCount;
    }

    public String getCurrentStatus() {
        return currentStatus;
    }

    public void setCurrentStatus(String currentStatus) {
        this.currentStatus = currentStatus;
    }

    public String getStatusHistory() {
        return statusHistory;
    }

    public void setStatusHistory(String statusHistory) {
        this.statusHistory = statusHistory;
    }

    public String getRelationships() {
        return relationships;
    }

    public void setRelationships(String relationships) {
        this.relationships = relationships;
    }
}
