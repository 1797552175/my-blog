package com.example.api.rag;

import com.knuddels.jtokkit.Encodings;
import com.knuddels.jtokkit.api.Encoding;
import com.knuddels.jtokkit.api.EncodingRegistry;
import com.knuddels.jtokkit.api.ModelType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

@Component
public class TokenBudgetManager {

    private static final Logger logger = LoggerFactory.getLogger(TokenBudgetManager.class);

    private EncodingRegistry registry;
    private Encoding encoding;

    // 默认Token预算配置
    public static final int DEFAULT_TOTAL_BUDGET = 8000;
    public static final int OUTPUT_RESERVE = 2000;
    public static final int AVAILABLE_BUDGET = DEFAULT_TOTAL_BUDGET - OUTPUT_RESERVE;

    // 预算分配比例
    public static final double WORLDBUILDING_RATIO = 0.25;
    public static final double HISTORY_RATIO = 0.60;
    public static final double CHOICE_RATIO = 0.15;

    @PostConstruct
    public void init() {
        registry = Encodings.newDefaultEncodingRegistry();
        encoding = registry.getEncodingForModel(ModelType.GPT_4O_MINI);
        logger.info("TokenBudgetManager initialized with encoding for GPT-4o-mini");
    }

    public int countTokens(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        try {
            return encoding.countTokens(text);
        } catch (Exception e) {
            logger.warn("Failed to count tokens, falling back to char estimate", e);
            return text.length() / 2;
        }
    }

    public int countTokensWithReserve(String text, int reserveTokens) {
        return countTokens(text) + reserveTokens;
    }

    public BudgetAllocation allocateBudget(int totalBudget, int outputReserve) {
        int available = totalBudget - outputReserve;

        return new BudgetAllocation(
                (int) (available * WORLDBUILDING_RATIO),
                (int) (available * HISTORY_RATIO),
                (int) (available * CHOICE_RATIO),
                outputReserve
        );
    }

    public BudgetAllocation allocateBudget() {
        return allocateBudget(DEFAULT_TOTAL_BUDGET, OUTPUT_RESERVE);
    }

    public boolean isWithinBudget(String text, int budget) {
        return countTokens(text) <= budget;
    }

    public String truncateToBudget(String text, int budget) {
        int tokens = countTokens(text);
        if (tokens <= budget) {
            return text;
        }

        // 二分查找截断点
        int low = 0;
        int high = text.length();
        int bestFit = 0;

        while (low <= high) {
            int mid = (low + high) / 2;
            String substring = text.substring(0, mid);
            int substringTokens = countTokens(substring);

            if (substringTokens <= budget) {
                bestFit = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return text.substring(0, bestFit) + "...（已截断）";
    }

    public TokenUsage calculateUsage(String systemPrompt, String userPrompt, String generatedContent) {
        int systemTokens = countTokens(systemPrompt);
        int userTokens = countTokens(userPrompt);
        int generatedTokens = countTokens(generatedContent);
        int totalTokens = systemTokens + userTokens + generatedTokens;

        return new TokenUsage(systemTokens, userTokens, generatedTokens, totalTokens);
    }

    public static class BudgetAllocation {
        private final int worldbuildingBudget;
        private final int historyBudget;
        private final int choiceBudget;
        private final int outputReserve;

        public BudgetAllocation(int worldbuildingBudget, int historyBudget, int choiceBudget, int outputReserve) {
            this.worldbuildingBudget = worldbuildingBudget;
            this.historyBudget = historyBudget;
            this.choiceBudget = choiceBudget;
            this.outputReserve = outputReserve;
        }

        public int getWorldbuildingBudget() {
            return worldbuildingBudget;
        }

        public int getHistoryBudget() {
            return historyBudget;
        }

        public int getChoiceBudget() {
            return choiceBudget;
        }

        public int getOutputReserve() {
            return outputReserve;
        }

        public int getTotalAvailable() {
            return worldbuildingBudget + historyBudget + choiceBudget;
        }

        @Override
        public String toString() {
            return String.format("BudgetAllocation{worldbuilding=%d, history=%d, choice=%d, output=%d}",
                    worldbuildingBudget, historyBudget, choiceBudget, outputReserve);
        }
    }

    public static class TokenUsage {
        private final int systemTokens;
        private final int userTokens;
        private final int generatedTokens;
        private final int totalTokens;

        public TokenUsage(int systemTokens, int userTokens, int generatedTokens, int totalTokens) {
            this.systemTokens = systemTokens;
            this.userTokens = userTokens;
            this.generatedTokens = generatedTokens;
            this.totalTokens = totalTokens;
        }

        public int getSystemTokens() {
            return systemTokens;
        }

        public int getUserTokens() {
            return userTokens;
        }

        public int getGeneratedTokens() {
            return generatedTokens;
        }

        public int getTotalTokens() {
            return totalTokens;
        }

        @Override
        public String toString() {
            return String.format("TokenUsage{system=%d, user=%d, generated=%d, total=%d}",
                    systemTokens, userTokens, generatedTokens, totalTokens);
        }
    }
}
