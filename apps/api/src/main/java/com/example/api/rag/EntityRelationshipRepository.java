package com.example.api.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EntityRelationshipRepository extends JpaRepository<EntityRelationship, Long> {

    List<EntityRelationship> findBySourceEntityId(Long sourceEntityId);

    List<EntityRelationship> findByTargetEntityId(Long targetEntityId);

    @Query("SELECT r FROM EntityRelationship r WHERE r.sourceEntity.id = :entityId OR r.targetEntity.id = :entityId")
    List<EntityRelationship> findByEntityId(@Param("entityId") Long entityId);

    @Query("SELECT r FROM EntityRelationship r WHERE r.sourceEntity.storySeed.id = :storySeedId AND r.isActive = true")
    List<EntityRelationship> findActiveByStorySeedId(@Param("storySeedId") Long storySeedId);

    @Query("SELECT r FROM EntityRelationship r WHERE r.sourceEntity.id = :sourceId AND r.targetEntity.id = :targetId")
    Optional<EntityRelationship> findBySourceAndTarget(
            @Param("sourceId") Long sourceId,
            @Param("targetId") Long targetId);

    @Query("SELECT r FROM EntityRelationship r WHERE r.relationshipType = :type AND r.sourceEntity.storySeed.id = :storySeedId")
    List<EntityRelationship> findByTypeAndStorySeedId(
            @Param("type") String type,
            @Param("storySeedId") Long storySeedId);

    @Query("SELECT r FROM EntityRelationship r WHERE r.sourceEntity.storySeed.id = :storySeedId ORDER BY r.strengthScore DESC")
    List<EntityRelationship> findByStorySeedIdOrderByStrength(@Param("storySeedId") Long storySeedId);

    @Query("SELECT r FROM EntityRelationship r WHERE r.sourceEntity.id = :entityId AND r.strengthScore >= :minStrength")
    List<EntityRelationship> findBySourceEntityIdAndStrengthGreaterThanEqual(
            @Param("entityId") Long entityId,
            @Param("minStrength") Integer minStrength);

    boolean existsBySourceEntityIdAndTargetEntityIdAndRelationshipType(
            Long sourceEntityId, Long targetEntityId, String relationshipType);

    @Query("SELECT COUNT(r) FROM EntityRelationship r WHERE r.sourceEntity.storySeed.id = :storySeedId AND r.isActive = true")
    Long countActiveByStorySeedId(@Param("storySeedId") Long storySeedId);
}
