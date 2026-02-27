package com.example.api.story.wiki.dto;

import com.example.api.story.wiki.StoryWikiCharacter;

import java.time.Instant;

public record WikiCharacterResponse(
        Long id,
        String name,
        String alias,
        String avatarUrl,
        String roleType,
        String roleTypeDisplayName,
        String age,
        String gender,
        String appearance,
        String personality,
        String background,
        String abilities,
        String relationships,
        String contentMarkdown,
        Integer sortOrder,
        Instant createdAt,
        Instant updatedAt
) {
    public static WikiCharacterResponse fromEntity(StoryWikiCharacter character) {
        return new WikiCharacterResponse(
                character.getId(),
                character.getName(),
                character.getAlias(),
                character.getAvatarUrl(),
                character.getRoleType() != null ? character.getRoleType().name() : null,
                character.getRoleType() != null ? character.getRoleType().getDisplayName() : null,
                character.getAge(),
                character.getGender(),
                character.getAppearance(),
                character.getPersonality(),
                character.getBackground(),
                character.getAbilities(),
                character.getRelationships(),
                character.getContentMarkdown(),
                character.getSortOrder(),
                character.getCreatedAt(),
                character.getUpdatedAt()
        );
    }
}
