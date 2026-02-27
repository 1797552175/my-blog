package com.example.api.readerfork.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoryPullRequestCreateRequest(
        @NotNull Long forkId,
        Long fromCommitId,
        @Size(max = 200) String title,
        @Size(max = 2000) String description
) {
}
