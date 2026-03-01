package com.example.api.story;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoryPrSubmissionRepository extends JpaRepository<StoryPrSubmission, Long> {

    List<StoryPrSubmission> findBySubmitter_IdOrderBySubmittedAtDesc(Long submitterId);

    List<StoryPrSubmission> findByStory_Author_IdOrderBySubmittedAtDesc(Long authorId);

    List<StoryPrSubmission> findByStory_IdAndStatusOrderBySubmittedAtDesc(Long storyId, String status);

    List<StoryPrSubmission> findByPrNovel_Id(Long prNovelId);
}
