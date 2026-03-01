package com.example.api.inspiration.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InspirationCreateRequest(
        @Size(max = 200) String title,
        @Valid List<MessageItem> messages,
        /** 小说方案快照（JSON 字符串），用于「一个选项 = 一条灵感」时的快速创作预填 */
        @Size(max = 10000) String optionSnapshot
) {
    public record MessageItem(
            @NotNull @Size(max = 20) String role,
            @NotNull String content
    ) {
    }
}
