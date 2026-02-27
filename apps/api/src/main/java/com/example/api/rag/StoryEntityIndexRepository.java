package com.example.api.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoryEntityIndexRepository extends JpaRepository<StoryEntityIndex, Long> {

    List<StoryEntityIndex> findByStorySeedId(Long storySeedId);

    List<StoryEntityIndex> findByStorySeedIdAndEntityType(Long storySeedId, String entityType);

    Optional<StoryEntityIndex> findByStorySeedIdAndEntityTypeAndEntityName(
            Long storySeedId, String entityType, String entityName);

    @Query("SELECT e FROM StoryEntityIndex e WHERE e.storySeed.id = :storySeedId ORDER BY e.appearanceCount DESC")
    List<StoryEntityIndex> findByStorySeedIdOrderByAppearanceCountDesc(@Param("storySeedId") Long storySeedId);

    @Query("SELECT e FROM StoryEntityIndex e WHERE e.storySeed.id = :storySeedId AND e.appearanceCount >= :minCount")
    List<StoryEntityIndex> findByStorySeedIdAndAppearanceCountGreaterThanEqual(
            @Param("storySeedId") Long storySeedId,
            @Param("minCount") int minCount);

    boolean existsByStorySeedIdAndEntityTypeAndEntityName(
            Long storySeedId, String entityType, String entityName);
}
