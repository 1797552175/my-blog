package com.example.api.storyseed;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.storyseed.dto.StoryBranchPointCreateRequest;
import com.example.api.storyseed.dto.StoryBranchPointResponse;
import com.example.api.storyseed.dto.StoryBranchPointUpdateRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/stories/{storyId}/branch-points")
public class StoryBranchPointController {

    private final StoryBranchPointService storyBranchPointService;

    public StoryBranchPointController(StoryBranchPointService storyBranchPointService) {
        this.storyBranchPointService = storyBranchPointService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StoryBranchPointResponse create(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @Valid @RequestBody StoryBranchPointCreateRequest request) {
        return storyBranchPointService.create(user.getUsername(), storyId, request);
    }

    @PutMapping("/{branchPointId}")
    public StoryBranchPointResponse update(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @PathVariable Long branchPointId,
            @Valid @RequestBody StoryBranchPointUpdateRequest request) {
        return storyBranchPointService.update(user.getUsername(), storyId, branchPointId, request);
    }

    @DeleteMapping("/{branchPointId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storyId,
            @PathVariable Long branchPointId) {
        storyBranchPointService.delete(user.getUsername(), storyId, branchPointId);
    }
}
