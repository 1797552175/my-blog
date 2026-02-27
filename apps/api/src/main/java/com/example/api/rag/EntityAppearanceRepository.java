package com.example.api.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EntityAppearanceRepository extends JpaRepository<EntityAppearance, Long> {

    List<EntityAppearance> findByEntityId(Long entityId);

    List<EntityAppearance> findByCommitId(Long commitId);

    @Query("SELECT a FROM EntityAppearance a WHERE a.entity.id = :entityId ORDER BY a.commit.sortOrder ASC")
    List<EntityAppearance> findByEntityIdOrderBySortOrder(@Param("entityId") Long entityId);

    @Query("SELECT a FROM EntityAppearance a WHERE a.entity.storySeed.id = :storySeedId AND a.commit.sortOrder BETWEEN :startOrder AND :endOrder")
    List<EntityAppearance> findByStorySeedIdAndSortOrderBetween(
            @Param("storySeedId") Long storySeedId,
            @Param("startOrder") int startOrder,
            @Param("endOrder") int endOrder);

    boolean existsByEntityIdAndCommitId(Long entityId, Long commitId);
}
