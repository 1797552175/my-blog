package com.example.api.storyseed;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryTermRepository extends JpaRepository<StoryTerm, Long> {

    List<StoryTerm> findByStorySeed_IdOrderBySortOrderAsc(Long storySeedId);

    List<StoryTerm> findByStory_IdOrderBySortOrderAsc(Long storyId);
}
