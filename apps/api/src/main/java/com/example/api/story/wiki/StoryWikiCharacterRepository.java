package com.example.api.story.wiki;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryWikiCharacterRepository extends JpaRepository<StoryWikiCharacter, Long> {

    List<StoryWikiCharacter> findByStoryIdOrderBySortOrderAsc(Long storyId);

    List<StoryWikiCharacter> findByStoryIdAndRoleTypeOrderBySortOrderAsc(Long storyId, StoryWikiCharacter.RoleType roleType);

    Optional<StoryWikiCharacter> findByStoryIdAndName(Long storyId, String name);

    boolean existsByStoryIdAndName(Long storyId, String name);
}
