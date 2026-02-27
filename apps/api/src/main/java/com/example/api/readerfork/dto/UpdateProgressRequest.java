package com.example.api.readerfork.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateProgressRequest(@NotNull Long commitId) {
}
