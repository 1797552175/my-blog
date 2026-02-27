package com.example.api.storyseed;

import com.example.api.storyseed.dto.StoryBranchPointCreateRequest;
import com.example.api.storyseed.dto.StoryBranchPointResponse;
import com.example.api.storyseed.dto.StoryBranchPointUpdateRequest;

public interface StoryBranchPointService {

    StoryBranchPointResponse create(String username, Long storyId, StoryBranchPointCreateRequest request);

    StoryBranchPointResponse update(String username, Long storyId, Long branchPointId, StoryBranchPointUpdateRequest request);

    void delete(String username, Long storyId, Long branchPointId);
}
