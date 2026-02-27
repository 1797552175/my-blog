package com.example.api.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryCommitSummaryRepository extends JpaRepository<StoryCommitSummary, Long> {

    Optional<StoryCommitSummary> findByCommitId(Long commitId);

    List<StoryCommitSummary> findByCommitIdIn(List<Long> commitIds);

    @Query("SELECT s FROM StoryCommitSummary s JOIN s.commit c WHERE c.fork.id = :forkId ORDER BY c.sortOrder ASC")
    List<StoryCommitSummary> findByForkIdOrderBySortOrder(@Param("forkId") Long forkId);

    @Query("SELECT s FROM StoryCommitSummary s JOIN s.commit c WHERE c.fork.id = :forkId AND c.sortOrder <= :maxOrder ORDER BY c.sortOrder ASC")
    List<StoryCommitSummary> findByForkIdAndSortOrderLessThanEqual(
            @Param("forkId") Long forkId,
            @Param("maxOrder") int maxOrder);

    boolean existsByCommitId(Long commitId);
}
