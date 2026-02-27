package com.example.api.inspiration.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InspirationCreateRequest(
        @Size(max = 200) String title,
        @Valid List<MessageItem> messages
) {
    public record MessageItem(
            @NotNull @Size(max = 20) String role,
            @NotNull String content
    ) {
    }
}
