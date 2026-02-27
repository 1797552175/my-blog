package com.example.api.storyseed;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryOptionRepository extends JpaRepository<StoryOption, Long> {

    List<StoryOption> findByBranchPoint_IdOrderBySortOrderAsc(Long branchPointId);
}
