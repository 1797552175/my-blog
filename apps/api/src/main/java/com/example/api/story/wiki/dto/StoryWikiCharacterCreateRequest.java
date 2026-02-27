package com.example.api.story.wiki.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StoryWikiCharacterCreateRequest(
        @NotBlank(message = "角色名称不能为空")
        @Size(max = 100, message = "角色名称不能超过100个字符")
        String name,

        @Size(max = 200, message = "别名不能超过200个字符")
        String alias,

        @Size(max = 500, message = "头像URL不能超过500个字符")
        String avatarUrl,

        String roleType,

        @Size(max = 50, message = "年龄不能超过50个字符")
        String age,

        @Size(max = 20, message = "性别不能超过20个字符")
        String gender,

        String appearance,

        String personality,

        String background,

        String abilities,

        String relationships,

        String contentMarkdown,

        Integer sortOrder
) {
}
