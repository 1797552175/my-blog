package com.example.api.comment;

import com.example.api.common.BaseEntity;
import com.example.api.post.Post;
import com.example.api.user.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
        name = "comments",
        indexes = {
                @Index(name = "idx_comments_post_id", columnList = "post_id"),
                @Index(name = "idx_comments_created_at", columnList = "created_at")
        })
public class Comment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "guest_name", length = 64)
    private String guestName;

    @Column(name = "guest_email", length = 128)
    private String guestEmail;

    @Column(name = "guest_url", length = 512)
    private String guestUrl;

    @Column(nullable = false, length = 2000)
    private String content;

    protected Comment() {
    }

    public Comment(Post post, String content) {
        this.post = post;
        this.content = content;
    }

    public Post getPost() {
        return post;
    }

    public void setPost(Post post) {
        this.post = post;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getGuestName() {
        return guestName;
    }

    public void setGuestName(String guestName) {
        this.guestName = guestName;
    }

    public String getGuestEmail() {
        return guestEmail;
    }

    public void setGuestEmail(String guestEmail) {
        this.guestEmail = guestEmail;
    }

    public String getGuestUrl() {
        return guestUrl;
    }

    public void setGuestUrl(String guestUrl) {
        this.guestUrl = guestUrl;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
