package com.example.api.story.wiki;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryWikiPageRepository extends JpaRepository<StoryWikiPage, Long> {

    List<StoryWikiPage> findByStoryIdOrderBySortOrderAsc(Long storyId);

    List<StoryWikiPage> findByStoryIdAndCategoryOrderBySortOrderAsc(Long storyId, StoryWikiPage.WikiCategory category);

    Optional<StoryWikiPage> findByStoryIdAndSlug(Long storyId, String slug);

    boolean existsByStoryIdAndSlug(Long storyId, String slug);

    void deleteByStoryIdAndSlug(Long storyId, String slug);
}
