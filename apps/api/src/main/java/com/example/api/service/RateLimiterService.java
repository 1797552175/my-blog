package com.example.api.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;

/**
 * 简单的内存限流服务
 */
@Service
public class RateLimiterService {

    // 存储请求计数，格式：key -> [最后请求时间, 请求次数]
    private final Map<String, long[]> requestCounts = new ConcurrentHashMap<>();

    /**
     * 检查是否允许请求
     * @param key 限流键（如 IP 地址）
     * @param limit 时间窗口内的最大请求数
     * @param windowMs 时间窗口（毫秒）
     * @return 是否允许请求
     */
    public boolean tryConsume(String key, int limit, long windowMs) {
        long now = System.currentTimeMillis();
        
        requestCounts.compute(key, (k, value) -> {
            if (value == null) {
                // 第一次请求，初始化计数器
                return new long[]{now, 1};
            } else {
                long lastTime = value[0];
                int count = (int) value[1];
                
                if (now - lastTime > windowMs) {
                    // 时间窗口已过，重置计数器
                    return new long[]{now, 1};
                } else {
                    // 时间窗口内，增加计数
                    value[1] = count + 1;
                    return value;
                }
            }
        });
        
        long[] value = requestCounts.get(key);
        int count = (int) value[1];
        return count <= limit;
    }

    /**
     * 检查作者分身对话接口的请求
     * @param clientIp 客户端 IP
     * @return 是否允许请求
     */
    public boolean tryConsumePersonaChat(String clientIp) {
        // 每分钟最多 10 次请求
        return tryConsume("persona_chat:" + clientIp, 10, TimeUnit.MINUTES.toMillis(1));
    }

    /**
     * 检查作者分身对话流式接口的请求
     * @param clientIp 客户端 IP
     * @return 是否允许请求
     */
    public boolean tryConsumePersonaChatStream(String clientIp) {
        // 每分钟最多 10 次请求
        return tryConsume("persona_chat_stream:" + clientIp, 10, TimeUnit.MINUTES.toMillis(1));
    }
}
