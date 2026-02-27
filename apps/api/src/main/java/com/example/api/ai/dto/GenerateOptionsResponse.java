package com.example.api.ai.dto;

import java.util.List;

public class GenerateOptionsResponse {
    private List<StoryOption> options;

    public GenerateOptionsResponse() {
    }

    public GenerateOptionsResponse(List<StoryOption> options) {
        this.options = options;
    }

    public List<StoryOption> getOptions() {
        return options;
    }

    public void setOptions(List<StoryOption> options) {
        this.options = options;
    }

    public static class StoryOption {
        private int id;
        private String label;
        private String description;

        public StoryOption() {
        }

        public StoryOption(int id, String label, String description) {
            this.id = id;
            this.label = label;
            this.description = description;
        }

        public int getId() {
            return id;
        }

        public void setId(int id) {
            this.id = id;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }
    }
}
