package com.example.api.rag;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "entity_relationships")
public class EntityRelationship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_entity_id", nullable = false)
    private StoryEntityIndex sourceEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_entity_id", nullable = false)
    private StoryEntityIndex targetEntity;

    @Column(name = "relationship_type", nullable = false, length = 50)
    private String relationshipType;

    @Column(name = "relationship_description", length = 500)
    private String relationshipDescription;

    @Column(name = "strength_score")
    private Integer strengthScore;

    @Column(name = "is_bidirectional", nullable = false)
    private Boolean isBidirectional = false;

    @Column(name = "first_appearance_commit_id")
    private Long firstAppearanceCommitId;

    @Column(name = "last_updated_commit_id")
    private Long lastUpdatedCommitId;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public EntityRelationship() {
    }

    public EntityRelationship(StoryEntityIndex sourceEntity, StoryEntityIndex targetEntity, String relationshipType) {
        this.sourceEntity = sourceEntity;
        this.targetEntity = targetEntity;
        this.relationshipType = relationshipType;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public StoryEntityIndex getSourceEntity() {
        return sourceEntity;
    }

    public void setSourceEntity(StoryEntityIndex sourceEntity) {
        this.sourceEntity = sourceEntity;
    }

    public StoryEntityIndex getTargetEntity() {
        return targetEntity;
    }

    public void setTargetEntity(StoryEntityIndex targetEntity) {
        this.targetEntity = targetEntity;
    }

    public String getRelationshipType() {
        return relationshipType;
    }

    public void setRelationshipType(String relationshipType) {
        this.relationshipType = relationshipType;
    }

    public String getRelationshipDescription() {
        return relationshipDescription;
    }

    public void setRelationshipDescription(String relationshipDescription) {
        this.relationshipDescription = relationshipDescription;
    }

    public Integer getStrengthScore() {
        return strengthScore;
    }

    public void setStrengthScore(Integer strengthScore) {
        this.strengthScore = strengthScore;
    }

    public Boolean getIsBidirectional() {
        return isBidirectional;
    }

    public void setIsBidirectional(Boolean isBidirectional) {
        this.isBidirectional = isBidirectional;
    }

    public Long getFirstAppearanceCommitId() {
        return firstAppearanceCommitId;
    }

    public void setFirstAppearanceCommitId(Long firstAppearanceCommitId) {
        this.firstAppearanceCommitId = firstAppearanceCommitId;
    }

    public Long getLastUpdatedCommitId() {
        return lastUpdatedCommitId;
    }

    public void setLastUpdatedCommitId(Long lastUpdatedCommitId) {
        this.lastUpdatedCommitId = lastUpdatedCommitId;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
