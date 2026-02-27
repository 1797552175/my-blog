package com.example.api.storyseed;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryCharacterRepository extends JpaRepository<StoryCharacter, Long> {

    List<StoryCharacter> findByStorySeed_IdOrderBySortOrderAsc(Long storySeedId);

    List<StoryCharacter> findByStory_IdOrderBySortOrderAsc(Long storyId);
}
