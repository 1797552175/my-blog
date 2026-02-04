package com.example.api.comment.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentCreateRequest(
        @Size(max = 64) String guestName,
        @Email @Size(max = 128) String guestEmail,
        @Size(max = 512) String guestUrl,
        @NotBlank @Size(max = 2000) String content
) {
}
