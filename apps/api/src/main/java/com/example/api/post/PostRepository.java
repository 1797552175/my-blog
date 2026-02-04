package com.example.api.post;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {

    Optional<Post> findBySlug(String slug);

    Page<Post> findByPublishedTrue(Pageable pageable);

    Page<Post> findByPublishedTrueAndTagsContaining(String tag, Pageable pageable);

    Page<Post> findByAuthor_Username(String username, Pageable pageable);

    Page<Post> findByAuthor_UsernameAndTagsContaining(String username, String tag, Pageable pageable);

    @Query(value = "SELECT DISTINCT pt.tag FROM post_tags pt JOIN posts p ON pt.post_id = p.id JOIN users u ON p.author_id = u.id WHERE u.username = :username ORDER BY pt.tag", nativeQuery = true)
    java.util.List<String> findDistinctTagsByAuthor_Username(@Param("username") String username);

    @Query(value = "SELECT pt.tag, COUNT(pt.post_id) FROM post_tags pt GROUP BY pt.tag ORDER BY COUNT(pt.post_id) DESC", nativeQuery = true)
    java.util.List<Object[]> findAllTagCounts();

    @Query("SELECT p FROM Post p WHERE p.published = true AND (LOWER(p.title) LIKE LOWER(CONCAT(CONCAT('%', :q), '%')) OR LOWER(p.contentMarkdown) LIKE LOWER(CONCAT(CONCAT('%', :q), '%')))")
    Page<Post> searchPublishedByKeyword(@Param("q") String q, Pageable pageable);

    List<Post> findByAuthor_IdAndPublishedTrueOrderByUpdatedAtDesc(Long authorId, Pageable pageable);

}
