package com.example.api.story;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface StoryChapterRepository extends JpaRepository<StoryChapter, Long> {

    /**
     * 获取小说的所有章节（包括所有分支）
     */
    List<StoryChapter> findByStoryIdOrderBySortOrderAsc(Long storyId);

    /**
     * 获取小说的主线章节
     */
    List<StoryChapter> findByStoryIdAndIsMainlineTrueOrderBySortOrderAsc(Long storyId);

    /**
     * 获取某个父章节的所有子章节
     */
    List<StoryChapter> findByParentChapterIdOrderBySortOrderAsc(Long parentChapterId);

    /**
     * 获取某个作者创作的所有章节
     */
    List<StoryChapter> findByStoryIdAndAuthorIdOrderBySortOrderAsc(Long storyId, Long authorId);

    @Query("SELECT c FROM StoryChapter c WHERE c.story.id = :storyId AND c.sortOrder <= :upTo ORDER BY c.sortOrder ASC")
    List<StoryChapter> findByStoryIdUpToSortOrder(@Param("storyId") Long storyId, @Param("upTo") int upToSortOrder);

    Optional<StoryChapter> findByIdAndStoryId(Long id, Long storyId);

    Optional<StoryChapter> findByStoryIdAndSortOrder(Long storyId, int sortOrder);

    int countByStoryId(Long storyId);

    /**
     * 在给定小说 ID 中，返回至少有一个章节的小说 ID 集合（用于列表 hasContent，不加载章节内容）
     */
    @Query("SELECT DISTINCT c.story.id FROM StoryChapter c WHERE c.story.id IN :storyIds")
    Set<Long> findDistinctStoryIdsByStoryIdIn(@Param("storyIds") Collection<Long> storyIds);

    /**
     * 统计小说的不同作者数量
     */
    @Query("SELECT COUNT(DISTINCT c.author.id) FROM StoryChapter c WHERE c.story.id = :storyId AND c.author IS NOT NULL")
    int countDistinctAuthorsByStoryId(@Param("storyId") Long storyId);

    /**
     * 获取小说的所有作者（去重）
     */
    @Query("SELECT DISTINCT c.author FROM StoryChapter c WHERE c.story.id = :storyId AND c.author IS NOT NULL")
    List<com.example.api.user.User> findDistinctAuthorsByStoryId(@Param("storyId") Long storyId);

    /**
     * 递归获取某个章节的所有后代章节（用于树形展示）
     */
    @Query(value = """
        WITH RECURSIVE chapter_tree AS (
            SELECT * FROM story_chapters WHERE id = :chapterId
            UNION ALL
            SELECT c.* FROM story_chapters c
            INNER JOIN chapter_tree ct ON c.parent_chapter_id = ct.id
        )
        SELECT * FROM chapter_tree
        """, nativeQuery = true)
    List<StoryChapter> findAllDescendants(@Param("chapterId") Long chapterId);

    /**
     * 获取某个章节的祖先链（用于面包屑）
     */
    @Query(value = """
        WITH RECURSIVE chapter_path AS (
            SELECT * FROM story_chapters WHERE id = :chapterId
            UNION ALL
            SELECT c.* FROM story_chapters c
            INNER JOIN chapter_path cp ON c.id = cp.parent_chapter_id
        )
        SELECT * FROM chapter_path ORDER BY sort_order ASC
        """, nativeQuery = true)
    List<StoryChapter> findAncestorChain(@Param("chapterId") Long chapterId);
}
