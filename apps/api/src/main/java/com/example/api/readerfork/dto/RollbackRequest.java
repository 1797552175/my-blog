package com.example.api.readerfork.dto;

import jakarta.validation.constraints.NotNull;

public record RollbackRequest(@NotNull Long commitId) {
}
