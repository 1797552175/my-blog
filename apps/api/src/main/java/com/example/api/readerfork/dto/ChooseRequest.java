package com.example.api.readerfork.dto;

import jakarta.validation.constraints.NotNull;

public record ChooseRequest(
        @NotNull Long branchPointId,
        @NotNull Long optionId
) {
}
