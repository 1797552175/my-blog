package com.example.api.storyseed;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryBranchPointRepository extends JpaRepository<StoryBranchPoint, Long> {

    List<StoryBranchPoint> findByStorySeed_IdOrderBySortOrderAsc(Long storySeedId);

    List<StoryBranchPoint> findByStory_IdOrderBySortOrderAsc(Long storyId);
}
