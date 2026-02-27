package com.example.api.readerfork;

import com.example.api.common.BaseEntity;
import com.example.api.storyseed.StoryBranchPoint;
import com.example.api.storyseed.StoryOption;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "story_commits",
        indexes = {
                @Index(name = "idx_story_commits_fork_id", columnList = "fork_id"),
                @Index(name = "idx_story_commits_parent_id", columnList = "parent_commit_id")
        })
public class StoryCommit extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fork_id", nullable = false)
    private ReaderFork fork;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_commit_id")
    private StoryCommit parentCommit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_point_id")
    private StoryBranchPoint branchPoint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id")
    private StoryOption option;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String contentMarkdown;

    @Column(nullable = false)
    private int sortOrder;

    protected StoryCommit() {
    }

    public StoryCommit(ReaderFork fork, StoryCommit parentCommit, StoryBranchPoint branchPoint, StoryOption option,
            String contentMarkdown, int sortOrder) {
        this.fork = fork;
        this.parentCommit = parentCommit;
        this.branchPoint = branchPoint;
        this.option = option;
        this.contentMarkdown = contentMarkdown;
        this.sortOrder = sortOrder;
    }

    public ReaderFork getFork() {
        return fork;
    }

    public void setFork(ReaderFork fork) {
        this.fork = fork;
    }

    public StoryCommit getParentCommit() {
        return parentCommit;
    }

    public void setParentCommit(StoryCommit parentCommit) {
        this.parentCommit = parentCommit;
    }

    public StoryBranchPoint getBranchPoint() {
        return branchPoint;
    }

    public void setBranchPoint(StoryBranchPoint branchPoint) {
        this.branchPoint = branchPoint;
    }

    public StoryOption getOption() {
        return option;
    }

    public void setOption(StoryOption option) {
        this.option = option;
    }

    public String getContentMarkdown() {
        return contentMarkdown;
    }

    public void setContentMarkdown(String contentMarkdown) {
        this.contentMarkdown = contentMarkdown;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
