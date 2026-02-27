package com.example.api.readerfork;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryPullRequestRepository extends JpaRepository<StoryPullRequest, Long> {

    List<StoryPullRequest> findByStorySeed_IdOrderByCreatedAtDesc(Long storySeedId);
}
