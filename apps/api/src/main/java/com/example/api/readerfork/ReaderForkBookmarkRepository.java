package com.example.api.readerfork;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReaderForkBookmarkRepository extends JpaRepository<ReaderForkBookmark, Long> {

    List<ReaderForkBookmark> findByForkIdAndReaderIdOrderBySortOrderAscCreatedAtAsc(Long forkId, Long readerId);

    Optional<ReaderForkBookmark> findByForkIdAndReaderIdAndSortOrder(Long forkId, Long readerId, Integer sortOrder);

    @Query("SELECT MAX(b.sortOrder) FROM ReaderForkBookmark b WHERE b.forkId = :forkId AND b.readerId = :readerId")
    Optional<Integer> findMaxSortOrderByForkIdAndReaderId(@Param("forkId") Long forkId, @Param("readerId") Long readerId);

    void deleteByForkIdAndReaderIdAndId(Long forkId, Long readerId, Long id);

    void deleteByForkId(Long forkId);
}
