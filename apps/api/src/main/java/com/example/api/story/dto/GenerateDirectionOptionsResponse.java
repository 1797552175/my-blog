package com.example.api.story.dto;

import java.util.List;
import java.util.Map;

public record GenerateDirectionOptionsResponse(
        List<DirectionOption> options,
        Map<String, Object> debugInfo
) {
    public GenerateDirectionOptionsResponse(List<DirectionOption> options) {
        this(options, null);
    }

    public record DirectionOption(String title, String description) {
    }
}
