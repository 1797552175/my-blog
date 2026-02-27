package com.example.api.readerfork;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.example.api.readerfork.dto.StoryPullRequestCreateRequest;
import com.example.api.readerfork.dto.StoryPullRequestResponse;
import com.example.api.readerfork.dto.StoryPullRequestUpdateRequest;

import org.springframework.http.HttpStatus;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class StoryPullRequestController {

    private final StoryPullRequestService storyPullRequestService;

    public StoryPullRequestController(StoryPullRequestService storyPullRequestService) {
        this.storyPullRequestService = storyPullRequestService;
    }

    @PostMapping("/story-seeds/{storySeedId}/pull-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public StoryPullRequestResponse create(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storySeedId,
            @Valid @RequestBody StoryPullRequestCreateRequest request) {
        return storyPullRequestService.create(user.getUsername(), storySeedId, request);
    }

    @GetMapping("/story-seeds/{storySeedId}/pull-requests")
    public List<StoryPullRequestResponse> listByStorySeed(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long storySeedId) {
        return storyPullRequestService.listByStorySeed(user.getUsername(), storySeedId);
    }

    @GetMapping("/story-pull-requests/{prId}")
    public StoryPullRequestResponse getById(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long prId) {
        return storyPullRequestService.getById(user.getUsername(), prId);
    }

    @PatchMapping("/story-pull-requests/{prId}")
    public StoryPullRequestResponse updateStatus(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable Long prId,
            @Valid @RequestBody StoryPullRequestUpdateRequest request) {
        return storyPullRequestService.updateStatus(user.getUsername(), prId, request);
    }
}
