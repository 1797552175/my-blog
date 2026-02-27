package com.example.api.readerfork;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryCommitRepository extends JpaRepository<StoryCommit, Long> {

    List<StoryCommit> findByFork_IdOrderBySortOrderAsc(Long forkId);

    void deleteByFork_Id(Long forkId);

    void deleteByFork_IdAndSortOrderGreaterThan(Long forkId, int sortOrder);
}
