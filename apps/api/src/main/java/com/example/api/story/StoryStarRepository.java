package com.example.api.story;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface StoryStarRepository extends JpaRepository<StoryStar, Long> {

    Optional<StoryStar> findByStoryIdAndUserId(Long storyId, Long userId);

    boolean existsByStoryIdAndUserId(Long storyId, Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM StoryStar s WHERE s.story.id = :storyId AND s.user.id = :userId")
    void deleteByStoryIdAndUserId(@Param("storyId") Long storyId, @Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM StoryStar s WHERE s.story.id = :storyId")
    void deleteByStoryId(@Param("storyId") Long storyId);

    @Query("SELECT COUNT(s) FROM StoryStar s WHERE s.story.id = :storyId")
    long countByStoryId(@Param("storyId") Long storyId);

    @Modifying
    @Query("UPDATE Story s SET s.starCount = s.starCount + 1 WHERE s.id = :storyId")
    void incrementStarCount(@Param("storyId") Long storyId);

    @Modifying
    @Query("UPDATE Story s SET s.starCount = CASE WHEN s.starCount > 0 THEN s.starCount - 1 ELSE 0 END WHERE s.id = :storyId")
    void decrementStarCount(@Param("storyId") Long storyId);
}
