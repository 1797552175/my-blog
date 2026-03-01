package com.example.api.story;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryPrNovelRepository extends JpaRepository<StoryPrNovel, Long> {

    List<StoryPrNovel> findByCreator_IdOrderByCreatedAtDesc(Long creatorId);

    List<StoryPrNovel> findByStory_IdAndCreator_Id(Long storyId, Long creatorId);

    Optional<StoryPrNovel> findByIdAndCreator_Id(Long id, Long creatorId);

    List<StoryPrNovel> findByStory_Author_IdOrderByCreatedAtDesc(Long authorId);

    List<StoryPrNovel> findByStatusOrderByCreatedAtDesc(String status);

    boolean existsByStory_IdAndCreator_IdAndStatus(Long storyId, Long creatorId, String status);
}
