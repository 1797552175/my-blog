package com.example.api.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommitTimelineMappingRepository extends JpaRepository<CommitTimelineMapping, Long> {

    List<CommitTimelineMapping> findByTimelineId(Long timelineId);

    List<CommitTimelineMapping> findByCommitId(Long commitId);

    Optional<CommitTimelineMapping> findByTimelineIdAndCommitId(Long timelineId, Long commitId);

    @Query("SELECT m FROM CommitTimelineMapping m WHERE m.timeline.id = :timelineId ORDER BY m.timelineOrder ASC")
    List<CommitTimelineMapping> findByTimelineIdOrderByTimelineOrder(@Param("timelineId") Long timelineId);

    @Query("SELECT m FROM CommitTimelineMapping m WHERE m.timeline.id = :timelineId AND m.isDivergencePoint = true")
    List<CommitTimelineMapping> findDivergencePointsByTimelineId(@Param("timelineId") Long timelineId);

    @Query("SELECT MAX(m.timelineOrder) FROM CommitTimelineMapping m WHERE m.timeline.id = :timelineId")
    Integer findMaxTimelineOrderByTimelineId(@Param("timelineId") Long timelineId);

    @Query("SELECT m FROM CommitTimelineMapping m WHERE m.timeline.storySeed.id = :storySeedId AND m.commit.id = :commitId")
    List<CommitTimelineMapping> findByStorySeedIdAndCommitId(
            @Param("storySeedId") Long storySeedId,
            @Param("commitId") Long commitId);

    boolean existsByTimelineIdAndCommitId(Long timelineId, Long commitId);
}
