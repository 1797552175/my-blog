package com.example.api.ai;

import org.springframework.stereotype.Component;

/**
 * AI调试上下文
 * 用于在请求处理过程中收集调试信息
 */
@Component
public class AiDebugContext {
    
    private static final ThreadLocal<DebugInfo> context = new ThreadLocal<>();
    
    public static void init() {
        context.set(new DebugInfo());
    }
    
    public static void clear() {
        context.remove();
    }
    
    public static DebugInfo get() {
        return context.get();
    }
    
    public static boolean hasDebugInfo() {
        return context.get() != null;
    }
    
    public static void addLog(String key, String value) {
        DebugInfo info = context.get();
        if (info != null) {
            info.addLog(key, value);
        }
    }
    
    public static class DebugInfo {
        private final java.util.Map<String, String> logs = new java.util.LinkedHashMap<>();
        
        public void addLog(String key, String value) {
            logs.put(key, value);
        }
        
        public java.util.Map<String, String> getLogs() {
            return logs;
        }
    }
}
