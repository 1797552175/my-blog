package com.example.api.story;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryPrChapterRepository extends JpaRepository<StoryPrChapter, Long> {

    List<StoryPrChapter> findByPrNovel_IdOrderBySortOrderAsc(Long prNovelId);

    Optional<StoryPrChapter> findByPrNovel_IdAndSortOrder(Long prNovelId, int sortOrder);

    void deleteByPrNovel_IdAndSortOrderGreaterThan(Long prNovelId, int sortOrder);

    int countByPrNovel_Id(Long prNovelId);
}
