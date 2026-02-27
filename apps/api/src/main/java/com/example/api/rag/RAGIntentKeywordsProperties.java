package com.example.api.rag;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * RAG意图分析关键字配置属性
 * 从 application.yml 的 rag.intent 节点读取配置
 */
@Component
@ConfigurationProperties(prefix = "rag.intent")
public class RAGIntentKeywordsProperties {

    /**
     * 关键字配置
     */
    private Map<String, List<KeywordConfig>> keywords = new HashMap<>();

    /**
     * 阈值配置
     */
    private ThresholdConfig thresholds = new ThresholdConfig();

    /**
     * Prompt构建配置
     */
    private PromptConfig prompt = new PromptConfig();

    // ==================== 内部类 ====================

    /**
     * 关键字配置项
     */
    public static class KeywordConfig {
        private String keyword;
        private Integer weight = 1;
        private String description = "";

        public KeywordConfig() {
        }

        public KeywordConfig(String keyword, Integer weight, String description) {
            this.keyword = keyword;
            this.weight = weight;
            this.description = description;
        }

        public String getKeyword() {
            return keyword;
        }

        public void setKeyword(String keyword) {
            this.keyword = keyword;
        }

        public Integer getWeight() {
            return weight;
        }

        public void setWeight(Integer weight) {
            this.weight = weight;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }
    }

    /**
     * 阈值配置
     */
    public static class ThresholdConfig {
        private Integer complexScore = 3;
        private Integer simpleScore = 2;
        private Double highConfidence = 0.8;

        public Integer getComplexScore() {
            return complexScore;
        }

        public void setComplexScore(Integer complexScore) {
            this.complexScore = complexScore;
        }

        public Integer getSimpleScore() {
            return simpleScore;
        }

        public void setSimpleScore(Integer simpleScore) {
            this.simpleScore = simpleScore;
        }

        public Double getHighConfidence() {
            return highConfidence;
        }

        public void setHighConfidence(Double highConfidence) {
            this.highConfidence = highConfidence;
        }
    }

    /**
     * Prompt配置
     */
    public static class PromptConfig {
        private BudgetConfig budget = new BudgetConfig();

        public BudgetConfig getBudget() {
            return budget;
        }

        public void setBudget(BudgetConfig budget) {
            this.budget = budget;
        }
    }

    /**
     * 预算配置
     */
    public static class BudgetConfig {
        private Integer total = 8000;
        private Integer outputReserve = 2000;
        private Double worldbuilding = 0.25;
        private Double history = 0.60;
        private Double choice = 0.15;

        public Integer getTotal() {
            return total;
        }

        public void setTotal(Integer total) {
            this.total = total;
        }

        public Integer getOutputReserve() {
            return outputReserve;
        }

        public void setOutputReserve(Integer outputReserve) {
            this.outputReserve = outputReserve;
        }

        public Double getWorldbuilding() {
            return worldbuilding;
        }

        public void setWorldbuilding(Double worldbuilding) {
            this.worldbuilding = worldbuilding;
        }

        public Double getHistory() {
            return history;
        }

        public void setHistory(Double history) {
            this.history = history;
        }

        public Double getChoice() {
            return choice;
        }

        public void setChoice(Double choice) {
            this.choice = choice;
        }
    }

    // ==================== Getter/Setter ====================

    public Map<String, List<KeywordConfig>> getKeywords() {
        return keywords;
    }

    public void setKeywords(Map<String, List<KeywordConfig>> keywords) {
        this.keywords = keywords;
    }

    public ThresholdConfig getThresholds() {
        return thresholds;
    }

    public void setThresholds(ThresholdConfig thresholds) {
        this.thresholds = thresholds;
    }

    public PromptConfig getPrompt() {
        return prompt;
    }

    public void setPrompt(PromptConfig prompt) {
        this.prompt = prompt;
    }

    // ==================== 便捷方法 ====================

    /**
     * 获取简单查询关键字
     */
    public List<KeywordConfig> getSimpleKeywords() {
        return keywords.getOrDefault("simple", new ArrayList<>());
    }

    /**
     * 获取复杂查询关键字
     */
    public List<KeywordConfig> getComplexKeywords() {
        return keywords.getOrDefault("complex", new ArrayList<>());
    }

    /**
     * 获取时间范围关键字
     */
    public List<KeywordConfig> getTimeRecentKeywords() {
        return keywords.getOrDefault("time-recent", new ArrayList<>());
    }

    public List<KeywordConfig> getTimeMediumKeywords() {
        return keywords.getOrDefault("time-medium", new ArrayList<>());
    }

    public List<KeywordConfig> getTimeLongKeywords() {
        return keywords.getOrDefault("time-long", new ArrayList<>());
    }

    /**
     * 获取实体类型关键字
     */
    public List<KeywordConfig> getEntityCharacterKeywords() {
        return keywords.getOrDefault("entity-character", new ArrayList<>());
    }

    public List<KeywordConfig> getEntityLocationKeywords() {
        return keywords.getOrDefault("entity-location", new ArrayList<>());
    }

    public List<KeywordConfig> getEntityItemKeywords() {
        return keywords.getOrDefault("entity-item", new ArrayList<>());
    }

    public List<KeywordConfig> getEntityOrganizationKeywords() {
        return keywords.getOrDefault("entity-organization", new ArrayList<>());
    }

    /**
     * 获取所有关键字类型
     */
    public List<String> getAllKeywordTypes() {
        return new ArrayList<>(keywords.keySet());
    }

    /**
     * 获取指定类型的关键字
     */
    public List<KeywordConfig> getKeywordsByType(String type) {
        return keywords.getOrDefault(type, new ArrayList<>());
    }
}
