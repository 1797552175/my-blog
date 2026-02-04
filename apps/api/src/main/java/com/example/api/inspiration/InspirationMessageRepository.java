package com.example.api.inspiration;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InspirationMessageRepository extends JpaRepository<InspirationMessage, Long> {

    List<InspirationMessage> findByInspirationIdOrderBySeqAsc(Long inspirationId);

    @Modifying
    @Query("DELETE FROM InspirationMessage m WHERE m.inspiration.id = :inspirationId")
    void deleteByInspirationId(@Param("inspirationId") Long inspirationId);
}
