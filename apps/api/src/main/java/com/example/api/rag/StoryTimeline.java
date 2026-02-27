package com.example.api.rag;

import com.example.api.storyseed.StorySeed;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "story_timeline")
public class StoryTimeline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_seed_id", nullable = false)
    private StorySeed storySeed;

    @Column(name = "timeline_name", nullable = false, length = 100)
    private String timelineName;

    @Column(name = "timeline_description", length = 500)
    private String timelineDescription;

    @Column(name = "branch_point", length = 200)
    private String branchPoint;

    @Column(name = "divergence_commit_id")
    private Long divergenceCommitId;

    @Column(name = "is_main_timeline", nullable = false)
    private Boolean isMainTimeline = false;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "probability", precision = 3)
    private Double probability;

    @Column(name = "stability_score")
    private Integer stabilityScore;

    @OneToMany(mappedBy = "timeline", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<CommitTimelineMapping> commitMappings = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public StoryTimeline() {
    }

    public StoryTimeline(StorySeed storySeed, String timelineName) {
        this.storySeed = storySeed;
        this.timelineName = timelineName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public StorySeed getStorySeed() {
        return storySeed;
    }

    public void setStorySeed(StorySeed storySeed) {
        this.storySeed = storySeed;
    }

    public String getTimelineName() {
        return timelineName;
    }

    public void setTimelineName(String timelineName) {
        this.timelineName = timelineName;
    }

    public String getTimelineDescription() {
        return timelineDescription;
    }

    public void setTimelineDescription(String timelineDescription) {
        this.timelineDescription = timelineDescription;
    }

    public String getBranchPoint() {
        return branchPoint;
    }

    public void setBranchPoint(String branchPoint) {
        this.branchPoint = branchPoint;
    }

    public Long getDivergenceCommitId() {
        return divergenceCommitId;
    }

    public void setDivergenceCommitId(Long divergenceCommitId) {
        this.divergenceCommitId = divergenceCommitId;
    }

    public Boolean getIsMainTimeline() {
        return isMainTimeline;
    }

    public void setIsMainTimeline(Boolean isMainTimeline) {
        this.isMainTimeline = isMainTimeline;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public Double getProbability() {
        return probability;
    }

    public void setProbability(Double probability) {
        this.probability = probability;
    }

    public Integer getStabilityScore() {
        return stabilityScore;
    }

    public void setStabilityScore(Integer stabilityScore) {
        this.stabilityScore = stabilityScore;
    }

    public List<CommitTimelineMapping> getCommitMappings() {
        return commitMappings;
    }

    public void setCommitMappings(List<CommitTimelineMapping> commitMappings) {
        this.commitMappings = commitMappings;
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
