package com.example.api.readerfork;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ReaderForkRepository extends JpaRepository<ReaderFork, Long> {

    List<ReaderFork> findByStorySeed_Id(Long storySeedId);

    List<ReaderFork> findByStory_Id(Long storyId);

    List<ReaderFork> findByReader_Username(String username);

    List<ReaderFork> findByReader_UsernameOrderByUpdatedAtDesc(String username);

    Optional<ReaderFork> findByStorySeed_IdAndReader_Id(Long storySeedId, Long readerId);

    Optional<ReaderFork> findByStory_IdAndReader_Id(Long storyId, Long readerId);
}
