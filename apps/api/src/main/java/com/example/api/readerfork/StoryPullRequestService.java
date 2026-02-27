package com.example.api.readerfork;

import java.util.List;

import com.example.api.readerfork.dto.StoryPullRequestCreateRequest;
import com.example.api.readerfork.dto.StoryPullRequestResponse;
import com.example.api.readerfork.dto.StoryPullRequestUpdateRequest;

public interface StoryPullRequestService {

    StoryPullRequestResponse create(String username, Long storySeedId, StoryPullRequestCreateRequest request);

    List<StoryPullRequestResponse> listByStorySeed(String username, Long storySeedId);

    StoryPullRequestResponse getById(String username, Long prId);

    StoryPullRequestResponse updateStatus(String username, Long prId, StoryPullRequestUpdateRequest request);
}
