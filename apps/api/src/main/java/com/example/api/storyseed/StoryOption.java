package com.example.api.storyseed;

import com.example.api.common.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "story_options",
        indexes = {
                @Index(name = "idx_story_options_branch_point_id", columnList = "branch_point_id")
        })
public class StoryOption extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_point_id", nullable = false)
    private StoryBranchPoint branchPoint;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(nullable = false)
    private int sortOrder;

    @Column(columnDefinition = "TEXT")
    private String influenceNotes;

    @Column(nullable = false)
    private int selectionCount = 0;

    @Column(columnDefinition = "TEXT")
    private String plotHint;

    protected StoryOption() {
    }

    public StoryOption(StoryBranchPoint branchPoint, String label, int sortOrder) {
        this.branchPoint = branchPoint;
        this.label = label;
        this.sortOrder = sortOrder;
    }

    public StoryBranchPoint getBranchPoint() {
        return branchPoint;
    }

    public void setBranchPoint(StoryBranchPoint branchPoint) {
        this.branchPoint = branchPoint;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getInfluenceNotes() {
        return influenceNotes;
    }

    public void setInfluenceNotes(String influenceNotes) {
        this.influenceNotes = influenceNotes;
    }

    public int getSelectionCount() {
        return selectionCount;
    }

    public void setSelectionCount(int selectionCount) {
        this.selectionCount = selectionCount;
    }

    public String getPlotHint() {
        return plotHint;
    }

    public void setPlotHint(String plotHint) {
        this.plotHint = plotHint;
    }
}
