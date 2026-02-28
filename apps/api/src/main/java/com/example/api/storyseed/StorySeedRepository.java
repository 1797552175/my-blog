package com.example.api.storyseed;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StorySeedRepository extends JpaRepository<StorySeed, Long> {

    Optional<StorySeed> findBySlug(String slug);

    List<StorySeed> findByTitle(String title);

    Page<StorySeed> findByPublishedTrue(Pageable pageable);

    Page<StorySeed> findByAuthor_Username(String username, Pageable pageable);
}
