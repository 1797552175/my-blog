package com.example.api.storyseed;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryReadmeRepository extends JpaRepository<StoryReadme, Long> {

    Optional<StoryReadme> findByStorySeed_Id(Long storySeedId);

    Optional<StoryReadme> findByStory_Id(Long storyId);
}
