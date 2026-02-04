package com.example.api.inspiration;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "inspiration_messages",
        indexes = {
                @Index(name = "idx_inspiration_messages_inspiration_id", columnList = "inspiration_id")
        })
public class InspirationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inspiration_id", nullable = false)
    private Inspiration inspiration;

    @Column(nullable = false)
    private int seq;

    @Column(nullable = false, length = 20)
    private String role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        this.createdAt = Instant.now();
    }

    protected InspirationMessage() {
    }

    public InspirationMessage(Inspiration inspiration, int seq, String role, String content) {
        this.inspiration = inspiration;
        this.seq = seq;
        this.role = role;
        this.content = content;
    }

    public Long getId() {
        return id;
    }

    public Inspiration getInspiration() {
        return inspiration;
    }

    public void setInspiration(Inspiration inspiration) {
        this.inspiration = inspiration;
    }

    public int getSeq() {
        return seq;
    }

    public void setSeq(int seq) {
        this.seq = seq;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
