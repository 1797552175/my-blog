package com.example.api.inspiration;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InspirationRepository extends JpaRepository<Inspiration, Long> {

    Page<Inspiration> findByUser_IdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
