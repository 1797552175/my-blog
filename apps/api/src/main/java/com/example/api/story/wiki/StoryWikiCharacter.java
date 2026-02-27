package com.example.api.story.wiki;

import com.example.api.common.BaseEntity;
import com.example.api.story.Story;
import jakarta.persistence.*;

/**
 * 小说角色档案
 */
@Entity
@Table(
        name = "story_wiki_characters",
        indexes = {
                @Index(name = "idx_wiki_char_story_id", columnList = "story_id"),
                @Index(name = "idx_wiki_char_role_type", columnList = "story_id, role_type"),
                @Index(name = "idx_wiki_char_sort", columnList = "story_id, sort_order")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_wiki_char_story_name", columnNames = {"story_id", "name"})
        }
)
public class StoryWikiCharacter extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 200)
    private String alias;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "role_type", length = 50)
    @Enumerated(EnumType.STRING)
    private RoleType roleType;

    @Column(length = 50)
    private String age;

    @Column(length = 20)
    private String gender;

    @Column(columnDefinition = "TEXT")
    private String appearance;

    @Column(columnDefinition = "TEXT")
    private String personality;

    @Column(columnDefinition = "TEXT")
    private String background;

    @Column(columnDefinition = "TEXT")
    private String abilities;

    @Column(columnDefinition = "TEXT")
    private String relationships;

    @Column(name = "content_markdown", columnDefinition = "LONGTEXT")
    private String contentMarkdown;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    public enum RoleType {
        PROTAGONIST("主角"),
        SUPPORTING("配角"),
        ANTAGONIST("反派"),
        MINOR("龙套"),
        MENTOR("导师"),
        LOVE_INTEREST("恋爱对象");

        private final String displayName;

        RoleType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    protected StoryWikiCharacter() {
    }

    public StoryWikiCharacter(Story story, String name) {
        this.story = story;
        this.name = name;
    }

    public Story getStory() {
        return story;
    }

    public void setStory(Story story) {
        this.story = story;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAlias() {
        return alias;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public RoleType getRoleType() {
        return roleType;
    }

    public void setRoleType(RoleType roleType) {
        this.roleType = roleType;
    }

    public String getAge() {
        return age;
    }

    public void setAge(String age) {
        this.age = age;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getAppearance() {
        return appearance;
    }

    public void setAppearance(String appearance) {
        this.appearance = appearance;
    }

    public String getPersonality() {
        return personality;
    }

    public void setPersonality(String personality) {
        this.personality = personality;
    }

    public String getBackground() {
        return background;
    }

    public void setBackground(String background) {
        this.background = background;
    }

    public String getAbilities() {
        return abilities;
    }

    public void setAbilities(String abilities) {
        this.abilities = abilities;
    }

    public String getRelationships() {
        return relationships;
    }

    public void setRelationships(String relationships) {
        this.relationships = relationships;
    }

    public String getContentMarkdown() {
        return contentMarkdown;
    }

    public void setContentMarkdown(String contentMarkdown) {
        this.contentMarkdown = contentMarkdown;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
