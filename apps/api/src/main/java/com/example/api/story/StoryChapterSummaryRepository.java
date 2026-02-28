package com.example.api.story;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryChapterSummaryRepository extends JpaRepository<StoryChapterSummary, Long> {

    Optional<StoryChapterSummary> findByChapterId(Long chapterId);

    boolean existsByChapterId(Long chapterId);

    /** 按小说 ID 查该小说下所有已存在摘要的章节摘要，按章节 sort_order 升序 */
    List<StoryChapterSummary> findByChapter_Story_IdOrderByChapter_SortOrderAsc(Long storyId);
}
