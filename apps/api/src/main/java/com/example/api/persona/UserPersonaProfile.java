package com.example.api.persona;

import com.example.api.user.User;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_persona_profile")
public class UserPersonaProfile {

    @Id
    private Long userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "distilled_content", columnDefinition = "LONGTEXT", nullable = true)
    private String distilledContent;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserPersonaProfile() {
    }

    public UserPersonaProfile(User user, String distilledContent) {
        this.user = user;
        this.distilledContent = distilledContent;
        this.updatedAt = Instant.now();
    }

    public Long getUserId() {
        return userId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getDistilledContent() {
        return distilledContent;
    }

    public void setDistilledContent(String distilledContent) {
        this.distilledContent = distilledContent;
        this.updatedAt = Instant.now();
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
