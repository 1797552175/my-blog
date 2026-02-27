package com.example.api.storyseed.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoryBranchPointCreateRequest(
        @NotNull int sortOrder,
        @Size(max = 500) String anchorText,
        @Valid List<StoryOptionItem> options
) {
    public record StoryOptionItem(
            @NotNull @Size(max = 200) String label,
            @NotNull int sortOrder,
            @Size(max = 2000) String influenceNotes
    ) {
    }
}
