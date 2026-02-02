package com.example.api.post;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {

    Optional<Post> findBySlug(String slug);

    Page<Post> findByPublishedTrue(Pageable pageable);

    Page<Post> findByAuthor_Username(String username, Pageable pageable);

}
