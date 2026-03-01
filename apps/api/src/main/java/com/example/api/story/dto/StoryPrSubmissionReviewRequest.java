package com.example.api.story.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StoryPrSubmissionReviewRequest(
        @NotBlank(message = "审核结果不能为空")
        @Pattern(regexp = "approved|rejected", message = "审核结果必须是 approved 或 rejected")
        String status,

        @Size(max = 1000, message = "审核意见长度不能超过1000字符")
        String reviewComment
) {
}
