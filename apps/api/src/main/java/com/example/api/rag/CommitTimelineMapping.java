package com.example.api.rag;

import com.example.api.readerfork.StoryCommit;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "commit_timeline_mapping")
public class CommitTimelineMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timeline_id", nullable = false)
    private StoryTimeline timeline;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commit_id", nullable = false)
    private StoryCommit commit;

    @Column(name = "timeline_order", nullable = false)
    private Integer timelineOrder;

    @Column(name = "is_divergence_point", nullable = false)
    private Boolean isDivergencePoint = false;

    @Column(name = "divergence_description", length = 500)
    private String divergenceDescription;

    @Column(name = "probability_at_this_point", precision = 3)
    private Double probabilityAtThisPoint;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public CommitTimelineMapping() {
    }

    public CommitTimelineMapping(StoryTimeline timeline, StoryCommit commit, Integer timelineOrder) {
        this.timeline = timeline;
        this.commit = commit;
        this.timelineOrder = timelineOrder;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public StoryTimeline getTimeline() {
        return timeline;
    }

    public void setTimeline(StoryTimeline timeline) {
        this.timeline = timeline;
    }

    public StoryCommit getCommit() {
        return commit;
    }

    public void setCommit(StoryCommit commit) {
        this.commit = commit;
    }

    public Integer getTimelineOrder() {
        return timelineOrder;
    }

    public void setTimelineOrder(Integer timelineOrder) {
        this.timelineOrder = timelineOrder;
    }

    public Boolean getIsDivergencePoint() {
        return isDivergencePoint;
    }

    public void setIsDivergencePoint(Boolean isDivergencePoint) {
        this.isDivergencePoint = isDivergencePoint;
    }

    public String getDivergenceDescription() {
        return divergenceDescription;
    }

    public void setDivergenceDescription(String divergenceDescription) {
        this.divergenceDescription = divergenceDescription;
    }

    public Double getProbabilityAtThisPoint() {
        return probabilityAtThisPoint;
    }

    public void setProbabilityAtThisPoint(Double probabilityAtThisPoint) {
        this.probabilityAtThisPoint = probabilityAtThisPoint;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
