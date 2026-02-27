package com.example.api.rag;

import com.example.api.common.BaseEntity;
import com.example.api.readerfork.StoryCommit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "story_commit_summaries",
        indexes = {
                @Index(name = "idx_commit_summaries_commit_id", columnList = "commit_id", unique = true)
        })
public class StoryCommitSummary extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commit_id", nullable = false, unique = true)
    private StoryCommit commit;

    @Column(nullable = false, length = 100)
    private String ultraShortSummary;

    @Column(nullable = false, length = 500)
    private String shortSummary;

    @Column(columnDefinition = "TEXT")
    private String mediumSummary;

    @Column(columnDefinition = "JSON")
    private String keyEvents;

    @Column(columnDefinition = "JSON")
    private String charactersInvolved;

    @Column(columnDefinition = "JSON")
    private String locationsInvolved;

    @Column(columnDefinition = "JSON")
    private String itemsInvolved;

    @Column(length = 50)
    private String emotionalTone;

    @Column(length = 200)
    private String chapterFunction;

    private Integer tokenEstimate;

    private Integer summaryTokenEstimate;

    @Column(columnDefinition = "JSON")
    private String prerequisiteChapters;

    protected StoryCommitSummary() {
    }

    public StoryCommitSummary(StoryCommit commit, String ultraShortSummary, String shortSummary) {
        this.commit = commit;
        this.ultraShortSummary = ultraShortSummary;
        this.shortSummary = shortSummary;
    }

    public StoryCommit getCommit() {
        return commit;
    }

    public void setCommit(StoryCommit commit) {
        this.commit = commit;
    }

    public String getUltraShortSummary() {
        return ultraShortSummary;
    }

    public void setUltraShortSummary(String ultraShortSummary) {
        this.ultraShortSummary = ultraShortSummary;
    }

    public String getShortSummary() {
        return shortSummary;
    }

    public void setShortSummary(String shortSummary) {
        this.shortSummary = shortSummary;
    }

    public String getMediumSummary() {
        return mediumSummary;
    }

    public void setMediumSummary(String mediumSummary) {
        this.mediumSummary = mediumSummary;
    }

    public String getKeyEvents() {
        return keyEvents;
    }

    public void setKeyEvents(String keyEvents) {
        this.keyEvents = keyEvents;
    }

    public String getCharactersInvolved() {
        return charactersInvolved;
    }

    public void setCharactersInvolved(String charactersInvolved) {
        this.charactersInvolved = charactersInvolved;
    }

    public String getLocationsInvolved() {
        return locationsInvolved;
    }

    public void setLocationsInvolved(String locationsInvolved) {
        this.locationsInvolved = locationsInvolved;
    }

    public String getItemsInvolved() {
        return itemsInvolved;
    }

    public void setItemsInvolved(String itemsInvolved) {
        this.itemsInvolved = itemsInvolved;
    }

    public String getEmotionalTone() {
        return emotionalTone;
    }

    public void setEmotionalTone(String emotionalTone) {
        this.emotionalTone = emotionalTone;
    }

    public String getChapterFunction() {
        return chapterFunction;
    }

    public void setChapterFunction(String chapterFunction) {
        this.chapterFunction = chapterFunction;
    }

    public Integer getTokenEstimate() {
        return tokenEstimate;
    }

    public void setTokenEstimate(Integer tokenEstimate) {
        this.tokenEstimate = tokenEstimate;
    }

    public Integer getSummaryTokenEstimate() {
        return summaryTokenEstimate;
    }

    public void setSummaryTokenEstimate(Integer summaryTokenEstimate) {
        this.summaryTokenEstimate = summaryTokenEstimate;
    }

    public String getPrerequisiteChapters() {
        return prerequisiteChapters;
    }

    public void setPrerequisiteChapters(String prerequisiteChapters) {
        this.prerequisiteChapters = prerequisiteChapters;
    }
}
