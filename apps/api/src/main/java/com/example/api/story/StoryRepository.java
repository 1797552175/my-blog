package com.example.api.story;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryRepository extends JpaRepository<Story, Long> {

    long countByPublishedTrue();

    long countByPublishedFalse();

    /**
     * 根据slug查找已发布的小说
     */
    Optional<Story> findBySlugAndPublishedTrue(String slug);

    /**
     * 根据slug查找（不考虑发布状态）
     */
    Optional<Story> findBySlug(String slug);

    /**
     * 列出所有已发布的小说（预取 author 和 tags 避免列表序列化时懒加载异常）
     */
    @EntityGraph(attributePaths = {"author", "tags"})
    Page<Story> findByPublishedTrue(Pageable pageable);

    /**
     * 列出开源的小说（预取 author 和 tags）
     */
    @EntityGraph(attributePaths = {"author", "tags"})
    Page<Story> findByPublishedTrueAndOpenSourceTrue(Pageable pageable);

    /**
     * 列出有章节内容的小说（预取 author 和 tags）
     */
    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT DISTINCT s FROM Story s JOIN s.chapters c WHERE s.published = true ORDER BY s.createdAt DESC")
    Page<Story> findByPublishedTrueAndHasChapters(Pageable pageable);

    /**
     * 列出作者的所有小说（分页，预取 author 和 tags 避免列表序列化时懒加载异常）
     */
    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT s FROM Story s WHERE s.author.username = :username ORDER BY s.createdAt DESC")
    Page<Story> findByAuthorUsername(@Param("username") String username, Pageable pageable);

    /**
     * 列出作者的所有小说（列表）
     */
    @Query("SELECT s FROM Story s WHERE s.author.username = :username ORDER BY s.createdAt DESC")
    List<Story> findByAuthorUsername(@Param("username") String username);

    /**
     * 列出作者已发布的小说（按更新时间倒序，用于人设提取）
     */
    @EntityGraph(attributePaths = {"author"})
    Page<Story> findByAuthor_IdAndPublishedTrueOrderByUpdatedAtDesc(Long authorId, Pageable pageable);

    /**
     * 根据ID查找已发布的小说
     */
    Optional<Story> findByIdAndPublishedTrue(Long id);

    /**
     * 根据ID和作者验证所有权（预取 author 和 tags 避免懒加载异常）
     */
    @EntityGraph(attributePaths = {"author", "tags"})
    Optional<Story> findByIdAndAuthorUsername(Long id, String username);

    /**
     * 搜索已发布的小说（标题、摘要、标签，预取 author 和 tags）
     */
    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT DISTINCT s FROM Story s LEFT JOIN s.tags t " +
           "WHERE s.published = true AND (LOWER(s.title) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(s.storySummary) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(t) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "ORDER BY s.createdAt DESC")
    Page<Story> searchPublished(@Param("q") String query, Pageable pageable);

    /**
     * 高级搜索：支持多标签筛选、状态筛选等
     */
    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT DISTINCT s FROM Story s " +
           "WHERE s.published = true " +
           "AND (:q IS NULL OR LOWER(s.title) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(s.storySummary) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "AND (:openSource IS NULL OR s.openSource = :openSource) " +
           "AND (:tags IS NULL OR EXISTS (SELECT 1 FROM s.tags t WHERE t IN :tags)) " +
           "ORDER BY s.createdAt DESC")
    Page<Story> advancedSearch(
        @Param("q") String query,
        @Param("openSource") Boolean openSource,
        @Param("tags") List<String> tags,
        Pageable pageable
    );

    /**
     * 根据标签查找已发布的小说（预取 author 和 tags）
     */
    @EntityGraph(attributePaths = {"author", "tags"})
    @Query("SELECT DISTINCT s FROM Story s JOIN s.tags t " +
           "WHERE s.published = true AND LOWER(t) = LOWER(:tag) " +
           "ORDER BY s.createdAt DESC")
    Page<Story> findByPublishedTrueAndTag(@Param("tag") String tag, Pageable pageable);

    /**
     * 获取所有标签
     */
    @Query("SELECT DISTINCT t FROM Story s JOIN s.tags t WHERE s.published = true")
    List<String> findAllTags();

    /**
     * 获取所有标签及其使用次数
     */
    @Query("SELECT t, COUNT(s) FROM Story s JOIN s.tags t WHERE s.published = true GROUP BY t ORDER BY COUNT(s) DESC")
    List<Object[]> findAllTagCounts();

    /**
     * 获取作者的所有标签
     */
    @Query("SELECT DISTINCT t FROM Story s JOIN s.tags t WHERE s.author.username = :username")
    List<String> findTagsByAuthorUsername(@Param("username") String username);

    /**
     * 检查slug是否存在
     */
    boolean existsBySlug(String slug);

    /**
     * 原子增加fork计数
     */
    @Modifying
    @Transactional
    @Query("UPDATE Story s SET s.forkCount = s.forkCount + 1 WHERE s.id = :storyId")
    void incrementForkCount(@Param("storyId") Long storyId);

    /**
     * 原子减少fork计数
     */
    @Modifying
    @Transactional
    @Query("UPDATE Story s SET s.forkCount = CASE WHEN s.forkCount > 0 THEN s.forkCount - 1 ELSE 0 END WHERE s.id = :storyId")
    void decrementForkCount(@Param("storyId") Long storyId);
}
