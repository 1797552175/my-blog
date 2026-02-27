package com.example.api.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryTimelineRepository extends JpaRepository<StoryTimeline, Long> {

    List<StoryTimeline> findByStorySeedId(Long storySeedId);

    List<StoryTimeline> findByStorySeedIdAndIsActiveTrue(Long storySeedId);

    Optional<StoryTimeline> findByStorySeedIdAndIsMainTimelineTrue(Long storySeedId);

    @Query("SELECT t FROM StoryTimeline t WHERE t.storySeed.id = :storySeedId AND t.probability >= :minProbability ORDER BY t.probability DESC")
    List<StoryTimeline> findByStorySeedIdAndProbabilityGreaterThanEqual(
            @Param("storySeedId") Long storySeedId,
            @Param("minProbability") Double minProbability);

    @Query("SELECT t FROM StoryTimeline t WHERE t.divergenceCommitId = :commitId")
    List<StoryTimeline> findByDivergenceCommitId(@Param("commitId") Long commitId);

    @Query("SELECT t FROM StoryTimeline t WHERE t.storySeed.id = :storySeedId ORDER BY t.isMainTimeline DESC, t.probability DESC")
    List<StoryTimeline> findByStorySeedIdOrderByMainAndProbability(@Param("storySeedId") Long storySeedId);

    boolean existsByStorySeedIdAndTimelineName(Long storySeedId, String timelineName);
}
